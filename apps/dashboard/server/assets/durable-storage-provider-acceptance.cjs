'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { checksum, storageError } = require('./storage-provider.cjs');

const ACCEPTANCE_VERSION = 'calinium-durable-storage-provider-acceptance-v1';
const ACCEPTANCE_REVISION = 'tigris-real-io-restore-v1';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(stable(value))).digest('hex'); }
function opaque(value) { return digest(value).slice(0, 24); }

// A deterministic package-shaped payload with ZIP local-file signature and a
// bounded Calinium manifest. The storage acceptance validates opaque bytes; it
// does not need to extract the package to prove provider restore integrity.
function acceptancePackageBytes() {
  const manifest = Buffer.from(JSON.stringify({
    contract_version: ACCEPTANCE_VERSION,
    files: ['layout/theme.liquid', 'templates/index.json'],
    purpose: 'public-provider-write-read-restore-acceptance'
  }, null, 2) + '\n');
  return Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('CALINIUM\0', 'utf8'), manifest]);
}

function referenceFor({ provider, objectKey, bytes, sha256 }) {
  return Object.freeze({
    reference_version: 'calinium-durable-object-reference-v1',
    id: `durable-object-${digest({ objectKey, sha256, bytes }).slice(0, 24)}`,
    storage_provider_kind: provider.kind,
    object_key: objectKey,
    sha256,
    bytes,
    content_type: 'application/zip',
    immutable: true
  });
}

function capabilityFromAcceptance(report) {
  return Object.freeze({
    status: report?.status === 'READY' ? 'READY' : 'NOT_READY',
    provider: report?.provider || null,
    acceptance_revision: report?.acceptance_revision || null,
    health_verified: report?.checks?.provider_health === true,
    io_verified: report?.checks?.conditional_write === true && report?.checks?.stat === true
      && report?.checks?.exact_read === true && report?.checks?.checksum === true,
    restore_verified: report?.checks?.fresh_runtime_restore === true && report?.checks?.wrong_checksum_rejected === true,
    lifecycle_verified: report?.checks?.authoritative_lifecycle_safe === true,
    immutability_verified: report?.checks?.identical_replay === true && report?.checks?.conflicting_replay_rejected === true,
    cleanup_verified: report?.checks?.disposable_cleanup === true,
    acceptance_checksum: report?.acceptance_checksum || null
  });
}

class DurableStorageProviderAcceptance {
  constructor({ provider, clock = () => new Date(), randomUUID = () => crypto.randomUUID() }) {
    if (!provider?.durable) throw new Error('Durable provider acceptance requires a durable storage provider.');
    this.provider = provider;
    this.clock = clock;
    this.randomUUID = randomUUID;
    this.accepted = null;
  }

  async run({ force = false } = {}) {
    if (this.accepted && !force) return this.accepted;
    const bytes = acceptancePackageBytes();
    const sha256 = checksum(bytes);
    const runIdentity = opaque({ revision: ACCEPTANCE_REVISION, run: this.randomUUID() });
    const objectKey = `organizations/${opaque('provider-acceptance')}/projects/${opaque('public-production')}/provider-acceptance/${runIdentity}/${sha256}.zip`;
    const reference = referenceFor({ provider: this.provider, objectKey, bytes: bytes.length, sha256 });
    let temporary = null;
    let written = false;
    const checks = {
      provider_health: false, conditional_write: false, stat: false, exact_read: false, checksum: false,
      durable_reference: false, identical_replay: false, conflicting_replay_rejected: false,
      authoritative_lifecycle_safe: false, fresh_runtime_restore: false, wrong_checksum_rejected: false,
      disposable_cleanup: false
    };
    try {
      const health = await this.provider.healthCheck();
      checks.provider_health = health?.ready === true && health?.durable === true;
      const created = await this.provider.put({ key: objectKey, buffer: bytes, checksumSha256: sha256, contentType: 'application/zip' });
      written = true;
      checks.conditional_write = created?.created === true && created?.immutable === true;
      const stat = await this.provider.stat({ key: reference.object_key });
      checks.stat = stat?.exists === true && stat?.size_bytes === bytes.length && (!stat.checksum_sha256 || stat.checksum_sha256 === sha256);
      const read = await this.provider.read({ key: reference.object_key, checksumSha256: reference.sha256 });
      checks.exact_read = read.equals(bytes);
      checks.checksum = checksum(read) === reference.sha256;
      checks.durable_reference = reference.storage_provider_kind === this.provider.kind
        && !reference.object_key.includes('public-production') && !reference.object_key.includes('provider-acceptance@');
      const replay = await this.provider.put({ key: objectKey, buffer: bytes, checksumSha256: sha256, contentType: 'application/zip' });
      checks.identical_replay = replay?.created === false && replay?.immutable === true;
      const conflict = Buffer.from(bytes);
      conflict[conflict.length - 1] ^= 0x01;
      try {
        await this.provider.put({ key: objectKey, buffer: conflict, checksumSha256: checksum(conflict), contentType: 'application/zip' });
      } catch (error) {
        checks.conflicting_replay_rejected = error?.code === 'storage_immutable_conflict';
      }
      const lifecycle = await this.provider.lifecyclePolicy();
      checks.authoritative_lifecycle_safe = lifecycle?.inspected === true && lifecycle?.authoritative_retention_safe === true;
      temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'calinium-provider-restore-'));
      const restoredPath = path.join(temporary, 'restored-theme.zip');
      const restored = await this.provider.read({ key: reference.object_key, checksumSha256: reference.sha256 });
      await fs.writeFile(restoredPath, restored, { mode: 0o600 });
      const fromFreshRuntime = await fs.readFile(restoredPath);
      checks.fresh_runtime_restore = fromFreshRuntime.equals(bytes) && checksum(fromFreshRuntime) === reference.sha256;
      try {
        await this.provider.read({ key: reference.object_key, checksumSha256: '0'.repeat(64) });
      } catch (error) {
        checks.wrong_checksum_rejected = error?.code === 'storage_checksum_mismatch';
      }
      if (Object.entries(checks).some(([name, value]) => name !== 'disposable_cleanup' && value !== true)) {
        throw storageError('storage_provider_acceptance_failed', 'Durable storage provider acceptance did not satisfy every required check.');
      }
      await this.provider.remove({ key: reference.object_key });
      written = false;
      checks.disposable_cleanup = (await this.provider.stat({ key: reference.object_key }))?.exists === false;
      if (!checks.disposable_cleanup) throw storageError('storage_provider_acceptance_failed', 'Disposable storage acceptance object cleanup could not be verified.');
      const base = Object.freeze({
        contract_version: ACCEPTANCE_VERSION,
        acceptance_revision: ACCEPTANCE_REVISION,
        status: 'READY',
        provider: this.provider.kind,
        checked_at: this.clock().toISOString(),
        checks: Object.freeze({ ...checks })
      });
      const report = Object.freeze({ ...base, acceptance_checksum: digest(base) });
      this.accepted = report;
      return report;
    } catch (error) {
      if (written) {
        try { await this.provider.remove({ key: reference.object_key }); } catch { /* preserve original fail-closed error */ }
      }
      if (error?.name === 'CaliniumStorageError') throw error;
      throw storageError('storage_provider_acceptance_failed', 'Durable storage provider acceptance failed.', error);
    } finally {
      if (temporary) await fs.rm(temporary, { recursive: true, force: true });
    }
  }
}

module.exports = {
  ACCEPTANCE_VERSION,
  ACCEPTANCE_REVISION,
  DurableStorageProviderAcceptance,
  acceptancePackageBytes,
  capabilityFromAcceptance
};
