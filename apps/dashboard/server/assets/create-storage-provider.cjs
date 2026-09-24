'use strict';

const path = require('path');
const { LocalFilesystemProvider } = require('./local-filesystem-provider.cjs');
const { ObjectStorageProvider } = require('./object-storage-provider.cjs');
const { createTigrisObjectStorageClient } = require('./tigris-object-storage-adapter.cjs');

function createStorageProvider({ root, env = process.env, provider = null, objectStorageClient = null, purpose = 'asset' } = {}) {
  if (provider) return provider;
  const environment = String(env.CALINIUM_ENVIRONMENT || (env.NODE_ENV === 'production' ? 'production' : 'development')).toLowerCase();
  const variable = purpose === 'artifact' ? 'CALINIUM_ARTIFACT_STORAGE_DRIVER' : 'CALINIUM_ASSET_STORAGE_DRIVER';
  const driver = String(env[variable] || (environment === 'production' ? '' : 'local')).toLowerCase();
  if (environment === 'production' && driver !== 'object') throw new Error(`Public production requires ${variable}=object.`);
  if (driver === 'object') {
    let client = objectStorageClient;
    const providerName = String(env.CALINIUM_OBJECT_STORAGE_PROVIDER || '').trim();
    const adapterModule = String(env.CALINIUM_OBJECT_STORAGE_ADAPTER_MODULE || '').trim();
    if (!client && providerName === 'tigris') {
      client = createTigrisObjectStorageClient({ env });
    } else if (!client && adapterModule && environment !== 'production') {
      const modulePath = adapterModule.startsWith('.') || adapterModule.startsWith('/') ? path.resolve(root, adapterModule) : adapterModule;
      const adapter = require(modulePath);
      if (typeof adapter.createObjectStorageClient !== 'function') throw new Error('The approved object storage adapter does not export createObjectStorageClient.');
      client = adapter.createObjectStorageClient({ env });
    }
    if (!client) throw new Error('Durable object storage is configured but no approved provider client is available.');
    return new ObjectStorageProvider({
      client,
      bucket: String(env.CALINIUM_OBJECT_STORAGE_BUCKET || ''),
      prefix: String(env.CALINIUM_OBJECT_STORAGE_PREFIX || 'calinium-public'),
      providerName: providerName || client.providerName || 'object-storage'
    });
  }
  if (driver !== 'local') throw new Error(`${variable} must be local or object.`);
  const configuredPath = purpose === 'artifact' ? env.CALINIUM_ARTIFACT_STORAGE_PATH : env.CALINIUM_ASSET_STORAGE_PATH;
  const localRoot = configuredPath
    || (purpose === 'artifact' && env.CALINIUM_ASSET_STORAGE_PATH
      ? path.join(path.dirname(path.resolve(env.CALINIUM_ASSET_STORAGE_PATH)), 'authoritative')
      : path.join(root, '.calinium-data', purpose === 'artifact' ? 'authoritative' : 'assets'));
  return new LocalFilesystemProvider({ root: localRoot });
}

function createAssetStorageProvider(options = {}) { return createStorageProvider({ ...options, purpose: 'asset' }); }
function createAuthoritativeStorageProvider(options = {}) { return createStorageProvider({ ...options, purpose: 'artifact' }); }

module.exports = { createStorageProvider, createAssetStorageProvider, createAuthoritativeStorageProvider };
