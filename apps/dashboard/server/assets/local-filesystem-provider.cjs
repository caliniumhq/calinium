'use strict';

const fs = require('fs/promises');
const path = require('path');
const { StorageProvider, assertStorageKey, checksum, storageError } = require('./storage-provider.cjs');

class LocalFilesystemProvider extends StorageProvider {
  constructor({ root }) { super(); this.root = path.resolve(root); this.kind = 'local-filesystem'; this.durable = false; }
  resolve(key) {
    const safeKey = assertStorageKey(key);
    const candidate = path.resolve(this.root, safeKey);
    if (!candidate.startsWith(`${this.root}${path.sep}`)) throw storageError('storage_key_invalid', 'Authoritative storage key escapes the storage root.');
    return candidate;
  }
  async put({ key, buffer, checksumSha256 = null }) {
    if (checksumSha256 && checksum(buffer) !== checksumSha256) throw storageError('storage_checksum_mismatch', 'Authoritative object checksum does not match the immutable write request.');
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    try {
      await fs.writeFile(target, buffer, { flag: 'wx', mode: 0o600 });
      return { key: assertStorageKey(key), checksum_sha256: checksum(buffer), immutable: true, created: true };
    } catch (error) {
      if (error.code !== 'EEXIST') throw storageError('storage_provider_unavailable', 'Local authoritative storage write failed.', error);
      const existing = await fs.readFile(target);
      if (checksum(existing) !== checksum(buffer)) throw storageError('storage_immutable_conflict', 'Immutable storage key contains different bytes.');
      return { key: assertStorageKey(key), checksum_sha256: checksum(buffer), immutable: true, created: false };
    }
  }
  async read({ key, checksumSha256 = null }) {
    let buffer;
    try { buffer = await fs.readFile(this.resolve(key)); }
    catch (error) {
      if (error.code === 'ENOENT') throw storageError('storage_object_missing', 'Stored object is unavailable.', error);
      throw storageError('storage_provider_unavailable', 'Local authoritative storage read failed.', error);
    }
    if (checksumSha256 && checksum(buffer) !== checksumSha256) throw storageError('storage_checksum_mismatch', 'Stored object checksum verification failed.');
    return buffer;
  }
  async remove({ key }) {
    try { await fs.unlink(this.resolve(key)); }
    catch (error) { if (error.code !== 'ENOENT') throw storageError('storage_deletion_failed', 'Local authoritative object deletion failed.', error); }
  }
  async stat({ key }) {
    try {
      const info = await fs.stat(this.resolve(key));
      return { exists: info.isFile(), size_bytes: info.size };
    } catch (error) {
      if (error.code === 'ENOENT') return { exists: false, size_bytes: null };
      throw storageError('storage_provider_unavailable', 'Local authoritative storage stat failed.', error);
    }
  }
  async healthCheck() {
    try {
      await fs.mkdir(this.root, { recursive: true });
      await fs.access(this.root, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) { throw storageError('storage_provider_unavailable', 'Local authoritative storage is unavailable.', error); }
    return { ready: true, provider: this.kind, durable: this.durable };
  }
}

module.exports = { LocalFilesystemProvider, assertStorageKey };
