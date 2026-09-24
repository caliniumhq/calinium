'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { checksum, storageError } = require('./storage-provider.cjs');

const REFERENCE_VERSION = 'calinium-durable-object-reference-v1';
const STORAGE_CLASSIFICATION = Object.freeze({
  AUTHORITATIVE_DURABLE: 'AUTHORITATIVE_DURABLE',
  TEMPORARY_RUNTIME: 'TEMPORARY_RUNTIME',
  OPTIONAL_DIAGNOSTIC: 'OPTIONAL_DIAGNOSTIC'
});
const CONTENT_TYPES = Object.freeze({
  '.json': 'application/json; charset=utf-8', '.zip': 'application/zip', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf',
  '.mp4': 'video/mp4', '.webm': 'video/webm'
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value))).digest('hex'); }
function opaque(value, length = 24) { return digest(value === null || value === undefined ? '' : value).slice(0, length); }
function extensionFor(contentType, localReference = '') {
  const extension = path.extname(localReference || '').toLowerCase();
  if (CONTENT_TYPES[extension]) return extension.slice(1);
  if (contentType === 'application/zip') return 'zip';
  if (contentType?.startsWith('application/json')) return 'json';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType === 'video/mp4') return 'mp4';
  if (contentType === 'video/webm') return 'webm';
  throw storageError('storage_content_type_unsupported', 'Authoritative storage content type is unsupported.');
}
function contentTypeFor(file) { return CONTENT_TYPES[path.extname(file).toLowerCase()] || null; }
function inside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || !relative.startsWith('..') && !path.isAbsolute(relative);
}
function assertScope(scope) {
  if (!scope?.organization_id || !scope?.project_id) throw storageError('storage_scope_invalid', 'Authoritative storage requires organization and project scope.');
  return scope;
}
function sameReference(left, right) {
  const fields = ['reference_version', 'organization_id', 'project_id', 'connection_id', 'canonical_shop', 'storage_provider_kind', 'object_key', 'sha256', 'bytes', 'content_type', 'object_class', 'evidence_kind', 'evidence_identity', 'lineage_identity', 'local_reference', 'retention_classification', 'immutable'];
  return fields.every((field) => (left?.[field] ?? null) === (right?.[field] ?? null));
}

class AuthoritativeObjectService {
  constructor({ root, store, provider, environment = 'development', clock = () => new Date() }) {
    if (!root || !store || !provider) throw new Error('Authoritative object storage requires root, store, and provider.');
    if (environment === 'production' && provider.durable !== true) throw storageError('storage_durable_provider_required', 'Public production cannot use local authoritative storage.');
    this.root = path.resolve(root);
    this.store = store;
    this.provider = provider;
    this.environment = environment;
    this.clock = clock;
  }

  reference(record) {
    return Object.freeze({
      reference_version: record.reference_version, id: record.id, storage_provider_kind: record.storage_provider_kind,
      object_key: record.object_key, sha256: record.sha256, bytes: record.bytes, content_type: record.content_type,
      immutable: record.immutable, created_at: record.created_at, organization_id: record.organization_id,
      project_id: record.project_id, canonical_shop: record.canonical_shop, evidence_kind: record.evidence_kind,
      evidence_identity: record.evidence_identity, lineage_identity: record.lineage_identity
    });
  }

  key({ scope, objectClass, evidenceKind, evidenceIdentity, sha256, contentType, localReference }) {
    const extension = extensionFor(contentType, localReference);
    const identity = opaque({ objectClass, evidenceKind, evidenceIdentity, localReference: localReference || null });
    return `organizations/${opaque(scope.organization_id)}/projects/${opaque(scope.project_id)}/authoritative/${objectClass}/${identity}/${sha256}.${extension}`;
  }

  localReference(file) {
    const absolute = path.resolve(file);
    if (!inside(this.root, absolute) || absolute === this.root) throw storageError('storage_local_reference_invalid', 'Authoritative source file is outside the application root.');
    return path.relative(this.root, absolute).split(path.sep).join('/');
  }

  async persistBuffer({ scope, buffer, contentType, objectClass, evidenceKind, evidenceIdentity, lineageIdentity = null, localReference = null, retentionClassification = 'FOUNDER_DECISION_REQUIRED' }) {
    assertScope(scope);
    if (!Buffer.isBuffer(buffer)) throw storageError('storage_bytes_invalid', 'Authoritative storage requires a byte buffer.');
    const sha256 = checksum(buffer);
    const objectKey = this.key({ scope, objectClass, evidenceKind, evidenceIdentity, sha256, contentType, localReference });
    const createdAt = this.clock().toISOString();
    const record = {
      reference_version: REFERENCE_VERSION,
      id: `durable-object-${digest({ objectKey, sha256, bytes: buffer.length }).slice(0, 24)}`,
      organization_id: scope.organization_id,
      project_id: scope.project_id,
      connection_id: scope.connection_id || null,
      canonical_shop: scope.canonical_shop || null,
      storage_provider_kind: this.provider.kind || 'unknown',
      object_key: objectKey,
      sha256,
      bytes: buffer.length,
      content_type: contentType,
      object_class: objectClass,
      evidence_kind: evidenceKind,
      evidence_identity: evidenceIdentity,
      lineage_identity: lineageIdentity,
      local_reference: localReference,
      retention_classification: retentionClassification,
      immutable: true,
      lifecycle_state: 'active',
      created_at: createdAt,
      deleted_at: null
    };
    await this.provider.put({ key: objectKey, buffer, checksumSha256: sha256, contentType });
    const stat = await this.provider.stat({ key: objectKey });
    if (stat?.exists !== true || stat.size_bytes !== buffer.length || stat.checksum_sha256 && stat.checksum_sha256 !== sha256) {
      throw storageError('storage_stat_mismatch', 'Authoritative object stat verification failed.');
    }
    const readBack = await this.provider.read({ key: objectKey, checksumSha256: sha256 });
    if (readBack.length !== buffer.length || !readBack.equals(buffer)) throw storageError('storage_readback_mismatch', 'Authoritative object read-back verification failed.');
    const retained = await this.store.createDurableObjectReference(record);
    if (!sameReference(retained, record) || retained.lifecycle_state === 'deleted') throw storageError('storage_reference_conflict', 'Durable object reference conflicts with retained authority.');
    return this.reference(retained);
  }

  async persistFile({ scope, file, contentType = null, ...input }) {
    const localReference = this.localReference(file);
    const resolvedType = contentType || contentTypeFor(file);
    if (!resolvedType) throw storageError('storage_content_type_unsupported', 'Authoritative file type is unsupported.');
    return this.persistBuffer({ ...input, scope, buffer: await fs.readFile(file), contentType: resolvedType, localReference });
  }

  async persistDirectory({ scope, directory, objectClass = 'render_evidence', evidenceKind, evidenceIdentity, retentionClassification = 'immutable_audit' }) {
    const absoluteDirectory = path.resolve(directory);
    if (!inside(path.resolve(this.root, 'output'), absoluteDirectory)) throw storageError('storage_local_reference_invalid', 'Authoritative evidence directory must remain inside output/.');
    const files = [];
    const visit = async (current) => {
      for (const entry of await fs.readdir(current, { withFileTypes: true })) {
        const target = path.join(current, entry.name);
        if (entry.isDirectory()) await visit(target);
        else if (entry.isFile() && contentTypeFor(target)) files.push(target);
      }
    };
    await visit(absoluteDirectory);
    files.sort();
    const references = [];
    for (const file of files) {
      const relative = path.relative(absoluteDirectory, file).split(path.sep).join('/');
      references.push(await this.persistFile({
        scope, file, objectClass, evidenceKind,
        evidenceIdentity: `${evidenceIdentity}:${opaque(relative, 16)}`,
        lineageIdentity: evidenceIdentity,
        retentionClassification
      }));
    }
    if (!references.length) throw storageError('storage_evidence_empty', 'Authoritative evidence set contains no durable files.');
    return Object.freeze({ lineage_identity: evidenceIdentity, references });
  }

  async read({ scope, reference }) {
    assertScope(scope);
    if (!reference?.id) throw storageError('storage_reference_invalid', 'Durable object reference is unavailable.');
    const retained = await this.store.findDurableObjectReference(reference.id, scope.project_id, scope.organization_id);
    if (!retained || retained.lifecycle_state === 'deleted' || retained.object_key !== reference.object_key
      || retained.sha256 !== reference.sha256 || retained.canonical_shop && retained.canonical_shop !== scope.canonical_shop) {
      throw storageError('storage_scope_mismatch', 'Durable object does not belong to the authorized project and shop.');
    }
    const buffer = await this.provider.read({ key: retained.object_key, checksumSha256: retained.sha256 });
    if (buffer.length !== retained.bytes) throw storageError('storage_readback_mismatch', 'Durable object byte length is stale.');
    return buffer;
  }

  async materialize({ scope, reference, target }) {
    const absolute = path.resolve(target);
    if (!inside(this.root, absolute) || absolute === this.root) throw storageError('storage_materialization_target_invalid', 'Runtime materialization escaped the application root.');
    const buffer = await this.read({ scope, reference });
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    const temporary = `${absolute}.tmp-${process.pid}-${crypto.randomUUID()}`;
    await fs.writeFile(temporary, buffer, { mode: 0o600 });
    await fs.rename(temporary, absolute);
    return absolute;
  }

  async restoreLineage({ scope, lineageIdentity }) {
    assertScope(scope);
    const references = await this.store.listDurableObjectReferencesForLineage({ organizationId: scope.organization_id, projectId: scope.project_id, lineageIdentity });
    for (const reference of references) {
      if (!reference.local_reference) continue;
      if (reference.canonical_shop && reference.canonical_shop !== scope.canonical_shop) throw storageError('storage_scope_mismatch', 'Durable evidence belongs to another shop.');
      await this.materialize({ scope, reference: this.reference(reference), target: path.resolve(this.root, reference.local_reference) });
    }
    return references.length;
  }

  async ensureLocalFile({ scope, localReference, objectClass = 'operator_evidence', evidenceKind, evidenceIdentity, lineageIdentity }) {
    assertScope(scope);
    const normalized = String(localReference || '').replace(/\\/g, '/').replace(/^\.\//, '');
    const absolute = path.resolve(this.root, normalized);
    if ((!normalized.startsWith('output/') && !normalized.startsWith('plans/')) || !inside(this.root, absolute)) {
      throw storageError('storage_local_reference_invalid', 'Authoritative evidence reference escaped its approved root.');
    }
    try {
      const info = await fs.stat(absolute);
      if (info.isFile()) return this.persistFile({
        scope, file: absolute, objectClass, evidenceKind, evidenceIdentity, lineageIdentity,
        retentionClassification: 'immutable_audit'
      });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const retained = await this.store.findDurableObjectReferencesByLocalReference({
      organizationId: scope.organization_id, projectId: scope.project_id, localReference: normalized
    });
    if (retained.length !== 1) throw storageError('storage_reference_missing', 'Authoritative evidence is unavailable or ambiguous.');
    await this.materialize({ scope, reference: this.reference(retained[0]), target: absolute });
    return this.reference(retained[0]);
  }

  async inventoryForProject({ scope }) {
    assertScope(scope);
    return this.store.listDurableObjectReferencesForProject(scope.project_id, scope.organization_id);
  }

  async restoreProjectEvidence({ scope, limit = 4096 }) {
    assertScope(scope);
    const references = await this.store.listDurableObjectReferencesForProject(scope.project_id, scope.organization_id);
    if (references.length > limit) throw storageError('storage_restore_set_too_large', 'Durable evidence restore set exceeds its bounded limit.');
    let restored = 0;
    for (const reference of references) {
      if (!reference.local_reference || (!reference.local_reference.startsWith('output/') && !reference.local_reference.startsWith('plans/'))) continue;
      if (reference.canonical_shop && reference.canonical_shop !== scope.canonical_shop) throw storageError('storage_scope_mismatch', 'Durable evidence belongs to another shop.');
      const target = path.resolve(this.root, reference.local_reference);
      try { if ((await fs.stat(target)).isFile()) continue; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await this.materialize({ scope, reference: this.reference(reference), target });
      restored += 1;
    }
    return restored;
  }

  async inventoryForShop({ canonicalShop }) {
    return this.store.listDurableObjectReferencesForShop(canonicalShop);
  }

  async deleteAuthorized({ scope, referenceId }) {
    assertScope(scope);
    const retained = await this.store.findDurableObjectReference(referenceId, scope.project_id, scope.organization_id);
    if (!retained || retained.lifecycle_state !== 'deletion_authorized') throw storageError('storage_deletion_not_authorized', 'Durable object deletion is not authorized by lifecycle policy.');
    if (retained.canonical_shop && retained.canonical_shop !== scope.canonical_shop) throw storageError('storage_scope_mismatch', 'Durable object belongs to another shop.');
    await this.provider.remove({ key: retained.object_key });
    const stat = await this.provider.stat({ key: retained.object_key });
    if (stat?.exists !== false) throw storageError('storage_deletion_failed', 'Durable object deletion could not be verified.');
    return this.store.markDurableObjectDeleted(referenceId, scope.project_id, scope.organization_id, this.clock().toISOString());
  }

  async healthCheck() {
    const result = await this.provider.healthCheck();
    if (this.environment === 'production' && result?.durable !== true) throw storageError('storage_durable_provider_required', 'Public production durable storage is not configured.');
    return { ...result, implementation_status: 'IMPLEMENTATION_READY' };
  }
}

module.exports = { AuthoritativeObjectService, REFERENCE_VERSION, STORAGE_CLASSIFICATION, CONTENT_TYPES, digest, contentTypeFor };
