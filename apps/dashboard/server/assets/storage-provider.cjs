'use strict';

const crypto = require('crypto');

function checksum(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

function storageError(code, message, cause = null) {
  const error = new Error(message);
  error.name = 'CaliniumStorageError';
  error.code = code;
  error.retryable = ['storage_provider_unavailable', 'storage_provider_timeout'].includes(code);
  // Provider errors can contain endpoints, signed request details, and account
  // identifiers. Retain only bounded machine-readable diagnostics.
  if (cause) {
    const providerCode = String(cause.code || cause.name || 'provider_error');
    error.provider_code = /^[A-Za-z0-9_.:-]{1,96}$/.test(providerCode) ? providerCode : 'provider_error';
    const status = Number(cause.status || cause.statusCode || cause.$metadata?.httpStatusCode);
    if (Number.isInteger(status) && status >= 100 && status <= 599) error.provider_http_status = status;
  }
  return error;
}

function assertStorageKey(key) {
  if (typeof key !== 'string'
    || key.length > 512
    || !/^organizations\/[a-z0-9_-]+\/projects\/[a-z0-9_-]+\/(?:[a-z0-9_-]+\/)+[a-z0-9][a-z0-9._-]*\.(png|jpe?g|webp|pdf|mp4|webm|json|zip)$/i.test(key)
    || key.includes('..')) {
    throw storageError('storage_key_invalid', 'Authoritative storage key is invalid.');
  }
  return key;
}

/**
 * Storage-provider contract. Providers receive relative opaque keys only and
 * must never return an absolute filesystem path to a caller.
 */
class StorageProvider {
  async put() { throw new Error('StorageProvider.put must be implemented.'); }
  async read() { throw new Error('StorageProvider.read must be implemented.'); }
  async remove() { throw new Error('StorageProvider.remove must be implemented.'); }
  async stat() { throw new Error('StorageProvider.stat must be implemented.'); }
  async healthCheck() { throw new Error('StorageProvider.healthCheck must be implemented.'); }
  async lifecyclePolicy() { throw new Error('StorageProvider.lifecyclePolicy must be implemented.'); }
}

module.exports = { StorageProvider, assertStorageKey, checksum, storageError };
