import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardStore } = require('../server/storage/create-store.cjs');
const { ObjectStorageProvider } = require('../server/assets/object-storage-provider.cjs');
const { LocalFilesystemProvider } = require('../server/assets/local-filesystem-provider.cjs');
const { AuthoritativeObjectService, REFERENCE_VERSION } = require('../server/assets/authoritative-object-service.cjs');
const { createSchemaValidator } = require('../../../ai/compiler/schema-validator.js');

const root = path.resolve(process.cwd(), '../..');
const cleanup = [];
afterEach(() => { while (cleanup.length) fs.rmSync(cleanup.pop(), { recursive: true, force: true }); });

function memoryProvider() {
  const objects = new Map();
  const client = {
    async putObject(input) {
      if (objects.has(input.key)) return { created: false, preconditionFailed: true };
      objects.set(input.key, { body: Buffer.from(input.body), metadata: { ...input.metadata }, contentType: input.contentType });
      return { created: true };
    },
    async getObject({ key }) {
      const object = objects.get(key);
      if (!object) throw Object.assign(new Error('missing'), { code: 'NotFound' });
      return { body: Buffer.from(object.body), metadata: { ...object.metadata } };
    },
    async deleteObject({ key }) { objects.delete(key); },
    async headObject({ key }) {
      const object = objects.get(key);
      return object ? { exists: true, sizeBytes: object.body.length, metadata: { ...object.metadata } } : { exists: false };
    },
    async healthCheck() { return { ready: true }; }
  };
  return { provider: new ObjectStorageProvider({ client, bucket: 'calinium-test-objects', prefix: 'test' }), objects };
}

async function database() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-durable-storage-'));
  cleanup.push(directory);
  const store = await createDashboardStore({ root, env: { CALINIUM_ENVIRONMENT: 'test', CALINIUM_STORAGE_DRIVER: 'sqlite', CALINIUM_SQLITE_PATH: path.join(directory, 'dashboard.sqlite') } });
  const at = '2026-09-21T00:00:00.000Z';
  await store.driver.run("INSERT INTO users(id,email,full_name,password_hash,status,created_at,updated_at) VALUES ($1,$2,$3,$4,'active',$5,$5)", ['usr_durable', 'durable@example.invalid', 'Durable', 'not-used', at]);
  await store.driver.run('INSERT INTO organizations(id,name,slug,created_by_user_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$5)', ['org_durable', 'Durable', 'durable', 'usr_durable', at]);
  await store.driver.run('INSERT INTO workspaces(id,organization_id,name,created_at,updated_at) VALUES ($1,$2,$3,$4,$4)', ['wrk_durable', 'org_durable', 'Durable', at]);
  for (const id of ['prj_durable', 'prj_other']) {
    await store.driver.run("INSERT INTO projects(id,organization_id,workspace_id,name,business_name,country,status,created_by_user_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$4,'US','active',$5,$6,$6)", [id, 'org_durable', 'wrk_durable', id, 'usr_durable', at]);
  }
  return store;
}

function scope(project = 'prj_durable', shop = 'fixture.myshopify.com') {
  return { organization_id: 'org_durable', project_id: project, connection_id: null, canonical_shop: shop };
}

describe('authoritative durable generated-artifact and evidence storage', () => {
  it('boots the additive reference schema on a clean database', async () => {
    const store = await database();
    expect(await store.driver.get('SELECT version FROM schema_migrations WHERE version = $1', [28])).toMatchObject({ version: 28 });
    expect(await store.driver.get('SELECT COUNT(*) AS count FROM durable_object_references')).toMatchObject({ count: 0 });
    await store.driver.close();
  });

  it('persists, verifies, converges identical replay, reloads after restart, and rejects cross-project reads', async () => {
    const store = await database();
    const { provider, objects } = memoryProvider();
    const service = new AuthoritativeObjectService({ root, store, provider, environment: 'production', clock: () => new Date('2026-09-21T01:00:00.000Z') });
    const bytes = Buffer.from('deterministic paid theme bytes');
    const input = {
      scope: scope(), buffer: bytes, contentType: 'application/zip', objectClass: 'generated_artifact',
      evidenceKind: 'theme_artifact_theme_zip', evidenceIdentity: 'generation-fixture:theme_zip',
      lineageIdentity: 'generation-fixture', retentionClassification: 'merchant_exportable'
    };
    const first = await service.persistBuffer(input);
    const replay = await service.persistBuffer(input);
    expect(replay).toEqual(first);
    expect(first).toMatchObject({ reference_version: REFERENCE_VERSION, immutable: true, bytes: bytes.length, storage_provider_kind: 'object-storage' });
    expect(createSchemaValidator(root).validateFile(first, 'schemas/calinium-durable-object-reference.schema.json', 'durable object reference')).toEqual([]);
    expect(objects.size).toBe(1);
    const restarted = new AuthoritativeObjectService({ root, store, provider, environment: 'production' });
    await expect(restarted.read({ scope: scope(), reference: first })).resolves.toEqual(bytes);
    await expect(restarted.read({ scope: scope('prj_other'), reference: first })).rejects.toMatchObject({ code: 'storage_scope_mismatch' });
    await expect(restarted.read({ scope: scope('prj_durable', 'other.myshopify.com'), reference: first })).rejects.toMatchObject({ code: 'storage_scope_mismatch' });
    await expect(restarted.read({ scope: { ...scope(), organization_id: 'org_other' }, reference: first })).rejects.toMatchObject({ code: 'storage_scope_mismatch' });
    const [opaqueKey] = [...objects.keys()];
    expect(opaqueKey).not.toContain('org_durable');
    expect(opaqueKey).not.toContain('prj_durable');
    expect(opaqueKey).not.toContain('fixture.myshopify.com');
    await store.driver.close();
  });

  it('durably stores and restores a complete render evidence lineage including byte-identical screenshots', async () => {
    const store = await database();
    const { provider, objects } = memoryProvider();
    const service = new AuthoritativeObjectService({ root, store, provider, environment: 'production' });
    const directory = path.join(root, 'output', `.durable-render-test-${crypto.randomUUID()}`);
    cleanup.push(directory);
    fs.mkdirSync(path.join(directory, 'screenshots'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'render-request.json'), '{"request":"fixture"}\n');
    fs.writeFileSync(path.join(directory, 'render-manifest.json'), '{"status":"passed"}\n');
    fs.writeFileSync(path.join(directory, 'screenshots', 'home-desktop.png'), Buffer.from('same-png'));
    fs.writeFileSync(path.join(directory, 'screenshots', 'home-mobile.png'), Buffer.from('same-png'));
    const persisted = await service.persistDirectory({
      scope: scope(), directory, evidenceKind: 'merchant_render_qa_evidence', evidenceIdentity: 'merchant-render-request-fixture'
    });
    expect(persisted.references).toHaveLength(4);
    expect(objects.size).toBe(4);
    fs.rmSync(directory, { recursive: true, force: true });
    expect(await service.restoreLineage({ scope: scope(), lineageIdentity: 'merchant-render-request-fixture' })).toBe(4);
    expect(fs.readFileSync(path.join(directory, 'screenshots', 'home-mobile.png'), 'utf8')).toBe('same-png');
    await store.driver.close();
  });

  it('exposes scoped privacy inventory and deletes only after explicit lifecycle authorization', async () => {
    const store = await database();
    const { provider } = memoryProvider();
    const service = new AuthoritativeObjectService({ root, store, provider, environment: 'production' });
    const reference = await service.persistBuffer({
      scope: scope(), buffer: Buffer.from('{"qa":true}\n'), contentType: 'application/json',
      objectClass: 'qa_evidence', evidenceKind: 'merchant_d1_evaluation', evidenceIdentity: 'd1-fixture',
      lineageIdentity: 'render-fixture', retentionClassification: 'immutable_audit'
    });
    expect(await service.inventoryForShop({ canonicalShop: 'fixture.myshopify.com' })).toHaveLength(1);
    await expect(service.deleteAuthorized({ scope: scope(), referenceId: reference.id })).rejects.toMatchObject({ code: 'storage_deletion_not_authorized' });
    await store.authorizeDurableObjectDeletion(reference.id, 'prj_durable', 'org_durable');
    expect(await service.deleteAuthorized({ scope: scope(), referenceId: reference.id })).toMatchObject({ lifecycle_state: 'deleted' });
    await store.driver.close();
  });

  it('rejects conflicting immutable bytes and local production fallback', async () => {
    const { provider } = memoryProvider();
    const key = 'organizations/org/projects/project/authoritative/test/object.json';
    await provider.put({ key, buffer: Buffer.from('one'), checksumSha256: crypto.createHash('sha256').update('one').digest('hex') });
    await expect(provider.put({ key, buffer: Buffer.from('two'), checksumSha256: crypto.createHash('sha256').update('two').digest('hex') })).rejects.toMatchObject({ code: 'storage_immutable_conflict' });
    const store = await database();
    expect(() => new AuthoritativeObjectService({ root, store, provider: new LocalFilesystemProvider({ root: path.join(os.tmpdir(), 'calinium-local-forbidden') }), environment: 'production' })).toThrow(/cannot use local/i);
    await store.driver.close();
  });

  it('normalizes provider failures and never records a partial authoritative write', async () => {
    const failingClient = {
      async putObject() { throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }); },
      async getObject() { throw Object.assign(new Error('missing'), { code: 'NotFound' }); },
      async deleteObject() { throw new Error('delete failed'); },
      async headObject() { throw new Error('stat failed'); },
      async healthCheck() { return { ready: false }; }
    };
    const failing = new ObjectStorageProvider({ client: failingClient, bucket: 'calinium-failure-test', prefix: 'test' });
    await expect(failing.put({ key: 'organizations/org/projects/project/evidence/object.json', buffer: Buffer.from('{}') })).rejects.toMatchObject({ code: 'storage_provider_timeout' });
    await expect(failing.read({ key: 'organizations/org/projects/project/evidence/object.json' })).rejects.toMatchObject({ code: 'storage_object_missing' });
    await expect(failing.stat({ key: 'organizations/org/projects/project/evidence/object.json' })).rejects.toMatchObject({ code: 'storage_provider_unavailable' });
    await expect(failing.remove({ key: 'organizations/org/projects/project/evidence/object.json' })).rejects.toMatchObject({ code: 'storage_deletion_failed' });
    await expect(failing.healthCheck()).rejects.toMatchObject({ code: 'storage_provider_unavailable' });

    const store = await database();
    const { provider } = memoryProvider();
    provider.stat = async () => ({ exists: true, size_bytes: 999, checksum_sha256: null });
    const service = new AuthoritativeObjectService({ root, store, provider, environment: 'production' });
    await expect(service.persistBuffer({
      scope: scope(), buffer: Buffer.from('{"partial":true}\n'), contentType: 'application/json; charset=utf-8',
      objectClass: 'qa_evidence', evidenceKind: 'partial_upload_fixture', evidenceIdentity: 'partial-upload-fixture'
    })).rejects.toMatchObject({ code: 'storage_stat_mismatch' });
    expect(await store.listDurableObjectReferencesForProject('prj_durable', 'org_durable')).toEqual([]);
    await store.driver.close();
  });
});
