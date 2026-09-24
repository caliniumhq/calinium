'use strict';

const { StorageProvider, assertStorageKey, checksum, storageError } = require('./storage-provider.cjs');

function bodyBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (Buffer.isBuffer(value?.body)) return value.body;
  if (value?.body instanceof Uint8Array) return Buffer.from(value.body);
  throw storageError('storage_object_body_unreadable', 'Object storage returned an unreadable object body.');
}
function providerCode(error) { return String(error?.code || error?.name || error?.status || error?.$metadata?.httpStatusCode || ''); }
function isTimeout(error) { return ['ETIMEDOUT', 'TimeoutError', 'RequestTimeout'].includes(providerCode(error)); }

class ObjectStorageProvider extends StorageProvider {
  constructor({ client, bucket, prefix = 'calinium', providerName = 'object-storage' }) {
    super();
    if (!client || !['putObject', 'getObject', 'deleteObject', 'headObject', 'healthCheck'].every((method) => typeof client[method] === 'function')) {
      throw new Error('Object storage requires a complete provider client.');
    }
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(String(bucket || ''))) throw new Error('Object storage bucket is invalid.');
    if (!/^[a-z0-9][a-z0-9/_-]*$/.test(String(prefix || ''))) throw new Error('Object storage prefix is invalid.');
    this.client = client;
    this.bucket = bucket;
    this.prefix = String(prefix).replace(/\/+$/, '');
    this.kind = providerName;
    this.durable = true;
  }
  objectKey(key) { return `${this.prefix}/${assertStorageKey(key)}`; }
  async put({ key, buffer, checksumSha256 = null, contentType = 'application/octet-stream' }) {
    const digest = checksum(buffer);
    if (checksumSha256 && checksumSha256 !== digest) throw storageError('storage_checksum_mismatch', 'Authoritative object checksum does not match the immutable write request.');
    let result;
    try {
      result = await this.client.putObject({
        bucket: this.bucket,
        key: this.objectKey(key),
        body: buffer,
        contentType,
        checksumSha256: digest,
        metadata: { 'calinium-sha256': digest },
        ifNoneMatch: '*'
      });
    } catch (error) {
      throw storageError(isTimeout(error) ? 'storage_provider_timeout' : 'storage_provider_unavailable', 'Durable object storage write failed.', error);
    }
    if (result?.created === false || result?.preconditionFailed === true) {
      let existing;
      try { existing = await this.read({ key, checksumSha256: digest }); }
      catch (error) {
        if (error?.code === 'storage_checksum_mismatch') throw storageError('storage_immutable_conflict', 'Immutable storage key contains different bytes.', error);
        throw error;
      }
      if (!existing.equals(buffer)) throw storageError('storage_immutable_conflict', 'Immutable storage key contains different bytes.');
      return { key: assertStorageKey(key), checksum_sha256: digest, immutable: true, created: false };
    }
    return { key: assertStorageKey(key), checksum_sha256: digest, immutable: true, created: true };
  }
  async read({ key, checksumSha256 = null }) {
    let result;
    try { result = await this.client.getObject({ bucket: this.bucket, key: this.objectKey(key) }); }
    catch (error) {
      if (['NotFound', 'NoSuchKey', '404'].includes(providerCode(error))) throw storageError('storage_object_missing', 'Stored object is unavailable.', error);
      throw storageError(isTimeout(error) ? 'storage_provider_timeout' : 'storage_provider_unavailable', 'Durable object storage read failed.', error);
    }
    const buffer = bodyBuffer(result);
    const digest = checksum(buffer);
    const recorded = result?.checksumSha256 || result?.metadata?.['calinium-sha256'] || null;
    if ((recorded && recorded !== digest) || (checksumSha256 && checksumSha256 !== digest)) throw storageError('storage_checksum_mismatch', 'Stored object checksum verification failed.');
    return buffer;
  }
  async remove({ key }) {
    try { await this.client.deleteObject({ bucket: this.bucket, key: this.objectKey(key) }); }
    catch (error) { throw storageError('storage_deletion_failed', 'Durable object deletion failed.', error); }
  }
  async stat({ key }) {
    let result;
    try { result = await this.client.headObject({ bucket: this.bucket, key: this.objectKey(key) }); }
    catch (error) {
      if (['NotFound', 'NoSuchKey', '404'].includes(providerCode(error))) return { exists: false, size_bytes: null };
      throw storageError('storage_provider_unavailable', 'Durable object storage stat failed.', error);
    }
    return { exists: result?.exists !== false, size_bytes: result?.sizeBytes ?? null, checksum_sha256: result?.checksumSha256 || result?.metadata?.['calinium-sha256'] || null };
  }
  async healthCheck() {
    let result;
    try { result = await this.client.healthCheck({ bucket: this.bucket, prefix: this.prefix }); }
    catch (error) { throw storageError('storage_provider_unavailable', 'Durable object storage health check failed.', error); }
    if (result?.ready !== true) throw storageError('storage_provider_unavailable', 'Durable object storage is unavailable.');
    return { ready: true, provider: this.kind, durable: this.durable };
  }
  async lifecyclePolicy() {
    if (typeof this.client.lifecyclePolicy !== 'function') throw storageError('storage_lifecycle_unavailable', 'Durable object storage lifecycle policy cannot be inspected.');
    try {
      return await this.client.lifecyclePolicy({ bucket: this.bucket, authoritativePrefix: `${this.prefix}/organizations/` });
    } catch (error) {
      throw storageError('storage_lifecycle_unavailable', 'Durable object storage lifecycle policy cannot be inspected.', error);
    }
  }
}

module.exports = { ObjectStorageProvider };
