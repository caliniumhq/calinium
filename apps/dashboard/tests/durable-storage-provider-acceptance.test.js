import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { ObjectStorageProvider } = require('../server/assets/object-storage-provider.cjs');
const { createSchemaValidator } = require('../../../ai/compiler/schema-validator.js');
const {
  DurableStorageProviderAcceptance,
  ACCEPTANCE_REVISION,
  capabilityFromAcceptance
} = require('../server/assets/durable-storage-provider-acceptance.cjs');
const {
  createTigrisObjectStorageClient,
  inspectLifecycleRules
} = require('../server/assets/tigris-object-storage-adapter.cjs');

function memoryProvider({ corruptRead = false, lifecycleSafe = true } = {}) {
  const objects = new Map();
  let reads = 0;
  const client = {
    async putObject(input) {
      if (objects.has(input.key)) return { created: false, preconditionFailed: true };
      objects.set(input.key, { body: Buffer.from(input.body), metadata: { ...input.metadata } });
      return { created: true };
    },
    async getObject({ key }) {
      const object = objects.get(key);
      if (!object) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
      reads += 1;
      const body = Buffer.from(object.body);
      if (corruptRead && reads === 1) body[body.length - 1] ^= 1;
      return { body, metadata: { ...object.metadata } };
    },
    async deleteObject({ key }) { objects.delete(key); },
    async headObject({ key }) {
      const object = objects.get(key);
      if (!object) throw Object.assign(new Error('missing'), { name: 'NotFound' });
      return { exists: true, sizeBytes: object.body.length, metadata: { ...object.metadata } };
    },
    async healthCheck() { return { ready: true }; },
    async lifecyclePolicy() {
      return { inspected: true, authoritative_retention_safe: lifecycleSafe, destructive_rule_count: lifecycleSafe ? 0 : 1 };
    }
  };
  return { provider: new ObjectStorageProvider({ client, bucket: 'calinium-public-objects', prefix: 'public', providerName: 'tigris' }), objects };
}

function tigrisEnv() {
  return {
    CALINIUM_OBJECT_STORAGE_PROVIDER: 'tigris',
    CALINIUM_OBJECT_STORAGE_ENDPOINT: 'https://t3.storage.dev',
    CALINIUM_OBJECT_STORAGE_REGION: 'auto',
    AWS_ACCESS_KEY_ID: 'fixture-access-key',
    AWS_SECRET_ACCESS_KEY: 'fixture-secret-key'
  };
}

describe('Public durable storage provider acceptance', () => {
  it('proves conditional I/O, replay, conflict rejection, lifecycle safety, restore, and disposable cleanup', async () => {
    const { provider, objects } = memoryProvider();
    const acceptance = new DurableStorageProviderAcceptance({
      provider,
      clock: () => new Date('2026-09-22T12:00:00.000Z'),
      randomUUID: () => '00000000-0000-4000-8000-000000000000'
    });
    const report = await acceptance.run();
    expect(report).toMatchObject({
      status: 'READY', provider: 'tigris', acceptance_revision: ACCEPTANCE_REVISION,
      checks: Object.fromEntries([
        'provider_health', 'conditional_write', 'stat', 'exact_read', 'checksum', 'durable_reference',
        'identical_replay', 'conflicting_replay_rejected', 'authoritative_lifecycle_safe',
        'fresh_runtime_restore', 'wrong_checksum_rejected', 'disposable_cleanup'
      ].map((key) => [key, true]))
    });
    expect(report.acceptance_checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(createSchemaValidator(process.cwd().replace(/\/apps\/dashboard$/, '')).validateFile(
      report,
      'schemas/calinium-durable-storage-provider-acceptance.schema.json',
      'durable storage provider acceptance'
    )).toEqual([]);
    expect(capabilityFromAcceptance(report)).toMatchObject({ status: 'READY', io_verified: true, restore_verified: true, lifecycle_verified: true });
    expect(objects.size).toBe(0);
    expect(JSON.stringify(report)).not.toContain('calinium-public-objects');
    expect(JSON.stringify(report)).not.toContain('fixture');
  });

  it('fails closed for corrupt provider bytes and unsafe authoritative lifecycle rules', async () => {
    const corrupt = memoryProvider({ corruptRead: true });
    await expect(new DurableStorageProviderAcceptance({ provider: corrupt.provider }).run()).rejects.toMatchObject({ code: 'storage_checksum_mismatch' });
    expect(corrupt.objects.size).toBe(0);
    const unsafe = memoryProvider({ lifecycleSafe: false });
    await expect(new DurableStorageProviderAcceptance({ provider: unsafe.provider }).run()).rejects.toMatchObject({ code: 'storage_provider_acceptance_failed' });
    expect(unsafe.objects.size).toBe(0);
  });

  it('maps the selected Tigris S3 contract without exposing endpoint or credentials', async () => {
    const objects = new Map();
    const commands = [];
    const s3Client = {
      async send(command) {
        commands.push(command.constructor.name);
        const input = command.input;
        if (command.constructor.name === 'HeadBucketCommand') return {};
        if (command.constructor.name === 'PutObjectCommand') {
          if (objects.has(input.Key)) throw Object.assign(new Error('conflict'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
          objects.set(input.Key, { body: Buffer.from(input.Body), metadata: input.Metadata });
          return {};
        }
        if (command.constructor.name === 'GetObjectCommand') {
          const object = objects.get(input.Key);
          return { Body: object.body, Metadata: object.metadata };
        }
        if (command.constructor.name === 'HeadObjectCommand') {
          const object = objects.get(input.Key);
          return { ContentLength: object.body.length, Metadata: object.metadata };
        }
        if (command.constructor.name === 'DeleteObjectCommand') { objects.delete(input.Key); return {}; }
        if (command.constructor.name === 'GetBucketLifecycleConfigurationCommand') return { Rules: [] };
        throw new Error('unexpected command');
      }
    };
    const client = createTigrisObjectStorageClient({ env: tigrisEnv(), s3Client });
    expect(await client.healthCheck({ bucket: 'bucket' })).toEqual({ ready: true });
    expect(await client.putObject({ bucket: 'bucket', key: 'key', body: Buffer.from('x'), metadata: { 'calinium-sha256': crypto.createHash('sha256').update('x').digest('hex') }, ifNoneMatch: '*' })).toEqual({ created: true });
    expect(await client.putObject({ bucket: 'bucket', key: 'key', body: Buffer.from('x'), metadata: {}, ifNoneMatch: '*' })).toMatchObject({ created: false, preconditionFailed: true });
    expect((await client.getObject({ bucket: 'bucket', key: 'key' })).body).toEqual(Buffer.from('x'));
    expect(await client.lifecyclePolicy({ bucket: 'bucket', authoritativePrefix: 'public/organizations/' })).toMatchObject({ inspected: true, authoritative_retention_safe: true });
    expect(commands).toEqual(expect.arrayContaining(['HeadBucketCommand', 'PutObjectCommand', 'GetObjectCommand', 'GetBucketLifecycleConfigurationCommand']));
    expect(inspectLifecycleRules([{ Status: 'Enabled', Prefix: 'public/', Expiration: { Days: 7 } }], 'public/organizations/')).toMatchObject({ authoritative_retention_safe: false, destructive_rule_count: 1 });
    expect(() => createTigrisObjectStorageClient({ env: { ...tigrisEnv(), CALINIUM_OBJECT_STORAGE_ENDPOINT: 'https://invalid.invalid' }, s3Client })).toThrow(/endpoint is invalid/i);
  });

  it('sanitizes raw provider failures', async () => {
    const secret = 'must-not-appear';
    const failing = new ObjectStorageProvider({
      bucket: 'calinium-public-objects', prefix: 'public', providerName: 'tigris',
      client: {
        async putObject() { throw Object.assign(new Error(`https://account.example/${secret}`), { code: 'AccessDenied', statusCode: 403 }); },
        async getObject() {}, async deleteObject() {}, async headObject() {}, async healthCheck() { return { ready: true }; }, async lifecyclePolicy() {}
      }
    });
    let failure;
    try { await failing.put({ key: 'organizations/org/projects/project/acceptance/item.json', buffer: Buffer.from('{}') }); } catch (error) { failure = error; }
    expect(failure).toMatchObject({ code: 'storage_provider_unavailable', provider_code: 'AccessDenied', provider_http_status: 403 });
    expect(JSON.stringify(failure)).not.toContain(secret);
    expect(failure.cause).toBeUndefined();
  });
});
