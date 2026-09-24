'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isPathInside } = require('../theme-generator/utils');
const { withoutShopifyStorefrontPassword } = require('./shopify-storefront-password-binding');

const SHOPIFY_CLI_RUNTIME_STATE_REVISION = 'shopify-cli-runtime-state-v1';
const AUTO_UPGRADE_PROJECT_DIRECTORY = 'shopify-cli-nodejs';
const AUTO_UPGRADE_CONFIGURATION_FILE = 'config.json';
const MAX_STATE_FILES = 256;
const MAX_STATE_FILE_BYTES = 1024 * 1024;
const MAX_STATE_TOTAL_BYTES = 8 * 1024 * 1024;
const SHOP_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;
const SCOPE_KINDS = new Set(['readiness', 'inventory', 'render']);

class ShopifyCliRuntimeStateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ShopifyCliRuntimeStateError';
    this.code = code;
  }
}

function stateError(code, message) { return new ShopifyCliRuntimeStateError(code, message); }
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

function requireAbsoluteDirectory(value, code, label) {
  const raw = String(value || '').trim();
  if (!raw || !path.isAbsolute(raw)) throw stateError(code, `${label} must be an absolute bounded directory.`);
  return path.resolve(raw);
}

function resolveShopifyCliRuntimeStateRoot({ root, env = process.env } = {}) {
  const repositoryRoot = path.resolve(root || path.join(__dirname, '../..'));
  const persistentRoot = requireAbsoluteDirectory(
    env.CALINIUM_PERSISTENT_ROOT || path.join(repositoryRoot, 'output'),
    'shopify_cli_runtime_state_root_invalid',
    'Shopify CLI persistent root'
  );
  const stateRoot = requireAbsoluteDirectory(
    env.CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT || path.join(persistentRoot, '.shopify-cli-runtime-state'),
    'shopify_cli_runtime_state_root_invalid',
    'Shopify CLI runtime-state root'
  );
  if (stateRoot === persistentRoot || !isPathInside(persistentRoot, stateRoot)) {
    throw stateError('shopify_cli_runtime_state_root_invalid', 'Shopify CLI runtime state must remain inside a dedicated persistent-root child directory.');
  }
  return { repository_root: repositoryRoot, persistent_root: persistentRoot, state_root: stateRoot };
}

function normalizeScope(scope = {}) {
  const kind = String(scope.kind || '').trim().toLowerCase();
  if (!SCOPE_KINDS.has(kind)) throw stateError('shopify_cli_runtime_state_scope_invalid', 'Shopify CLI runtime state requires a supported scope kind.');
  const jobId = String(scope.job_id || '').trim();
  if (!jobId || jobId.length > 200 || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(jobId)) {
    throw stateError('shopify_cli_runtime_state_scope_invalid', 'Shopify CLI runtime state requires a bounded job or operation identity.');
  }
  const shopDomain = scope.shop_domain === null || scope.shop_domain === undefined
    ? null
    : String(scope.shop_domain).trim().toLowerCase();
  if (kind !== 'readiness' && !SHOP_DOMAIN_PATTERN.test(shopDomain || '')) {
    throw stateError('shopify_cli_runtime_state_scope_invalid', 'Shopify CLI runtime state requires a canonical shop identity.');
  }
  if (kind === 'readiness' && shopDomain !== null && !SHOP_DOMAIN_PATTERN.test(shopDomain)) {
    throw stateError('shopify_cli_runtime_state_scope_invalid', 'Shopify CLI readiness state received an invalid shop identity.');
  }
  const binding = Object.freeze({ contract_version: SHOPIFY_CLI_RUNTIME_STATE_REVISION, kind, job_id: jobId, shop_domain: shopDomain });
  return { binding, scope_id: `shopify-cli-state-${digest(binding).slice(0, 24)}` };
}

function ensurePrivateDirectory(directory) {
  try {
    if (fs.existsSync(directory)) {
      const stat = fs.lstatSync(directory);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw stateError('shopify_cli_runtime_state_path_unsafe', 'Shopify CLI runtime state contains a non-directory or symbolic-link boundary.');
      }
    } else fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
  } catch (error) {
    if (error instanceof ShopifyCliRuntimeStateError) throw error;
    throw stateError('shopify_cli_runtime_state_unwritable', 'Shopify CLI runtime state cannot be created or written by the runtime user.');
  }
}

function ensureBoundedStateRoot({ persistent_root: persistentRoot, state_root: stateRoot }) {
  let persistentStat;
  try { persistentStat = fs.lstatSync(persistentRoot); }
  catch { throw stateError('shopify_cli_runtime_state_unwritable', 'Shopify CLI persistent state boundary is unavailable.'); }
  if (persistentStat.isSymbolicLink() || !persistentStat.isDirectory()) {
    throw stateError('shopify_cli_runtime_state_path_unsafe', 'Shopify CLI persistent state boundary must be a real directory.');
  }

  const relative = path.relative(persistentRoot, stateRoot);
  let cursor = persistentRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    ensurePrivateDirectory(cursor);
  }

  const persistentReal = fs.realpathSync(persistentRoot);
  const stateReal = fs.realpathSync(stateRoot);
  if (stateReal === persistentReal || !isPathInside(persistentReal, stateReal)) {
    throw stateError('shopify_cli_runtime_state_path_unsafe', 'Shopify CLI runtime state escaped its persistent filesystem boundary.');
  }
}

function assertBoundedEntry(root, candidate) {
  if (!isPathInside(root, candidate)) throw stateError('shopify_cli_runtime_state_path_unsafe', 'Shopify CLI runtime state escaped its approved scope.');
  const stat = fs.lstatSync(candidate);
  if (stat.isSymbolicLink()) throw stateError('shopify_cli_runtime_state_path_unsafe', 'Shopify CLI runtime state cannot contain symbolic links.');
  return stat;
}

function atomicWriteJson(file, value) {
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, file);
    fs.chmodSync(file, 0o600);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

function readAutoUpgradeConfiguration(file) {
  let configuration;
  try { configuration = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw stateError('shopify_cli_runtime_state_policy_invalid', 'Shopify CLI runtime auto-upgrade policy is unavailable or invalid.'); }
  if (!configuration || configuration.autoUpgradeEnabled !== false) {
    throw stateError('shopify_cli_runtime_state_autoupgrade_enabled', 'Shopify CLI runtime auto-upgrade policy must remain off.');
  }
  return configuration;
}

function credentialValues(env) {
  return Object.entries(env || {}).flatMap(([key, value]) => {
    if (!/(?:TOKEN|SECRET|PASSWORD|AUTHORIZATION|API_KEY)/i.test(key) || /(?:_ID|_ENABLED|_STATUS|_MODE)$/i.test(key)) return [];
    const normalized = String(value || '');
    return normalized.length >= 8 ? [normalized] : [];
  });
}

function stateFiles(scopePath) {
  const files = [];
  let bytes = 0;
  function visit(directory) {
    for (const name of fs.readdirSync(directory)) {
      const candidate = path.join(directory, name);
      const stat = assertBoundedEntry(scopePath, candidate);
      if (stat.isDirectory()) visit(candidate);
      else if (stat.isFile()) {
        if (stat.size > MAX_STATE_FILE_BYTES) throw stateError('shopify_cli_runtime_state_unbounded', 'Shopify CLI runtime state contains an oversized file.');
        files.push(candidate);
        bytes += stat.size;
        if (files.length > MAX_STATE_FILES || bytes > MAX_STATE_TOTAL_BYTES) {
          throw stateError('shopify_cli_runtime_state_unbounded', 'Shopify CLI runtime state exceeded its bounded file allowance.');
        }
      } else throw stateError('shopify_cli_runtime_state_path_unsafe', 'Shopify CLI runtime state contains an unsupported filesystem entry.');
    }
  }
  visit(scopePath);
  return files;
}

function assertNoCredentialPersistence(scopePath, env) {
  const secrets = credentialValues(env);
  for (const file of stateFiles(scopePath)) {
    const contents = fs.readFileSync(file);
    if (secrets.some((value) => contents.includes(Buffer.from(value)))) {
      throw stateError('shopify_cli_runtime_state_credential_persistence_detected', 'Shopify CLI runtime state persisted credential material.');
    }
    const text = contents.toString('utf8');
    if (/\bAuthorization\s*:\s*(?:Bearer|Basic)\s+\S+/i.test(text)
      || /\b(?:shpat_|shpua_|shpss_|sk-)[A-Za-z0-9_-]{12,}/.test(text)) {
      throw stateError('shopify_cli_runtime_state_credential_persistence_detected', 'Shopify CLI runtime state persisted credential-like material.');
    }
  }
  return true;
}

function assertCredentialValueAbsent(scopePath, value) {
  const credential = String(value || '');
  if (!credential) return true;
  const bytes = Buffer.from(credential);
  for (const file of stateFiles(scopePath)) {
    if (fs.readFileSync(file).includes(bytes)) {
      throw stateError('shopify_cli_runtime_state_credential_persistence_detected', 'Shopify CLI runtime state persisted credential material.');
    }
  }
  return true;
}

function assertWritable(directory) {
  const probe = path.join(directory, `.write-probe-${process.pid}-${crypto.randomBytes(6).toString('hex')}`);
  try { fs.writeFileSync(probe, '', { mode: 0o600, flag: 'wx' }); }
  catch { throw stateError('shopify_cli_runtime_state_unwritable', 'Shopify CLI runtime state is not writable by the runtime user.'); }
  finally { if (fs.existsSync(probe)) fs.rmSync(probe, { force: true }); }
}

function initializeShopifyCliRuntimeState({ root, env = process.env, scope } = {}) {
  if (String(env.CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION || SHOPIFY_CLI_RUNTIME_STATE_REVISION) !== SHOPIFY_CLI_RUNTIME_STATE_REVISION) {
    throw stateError('shopify_cli_runtime_state_revision_invalid', 'Shopify CLI runtime-state contract revision is invalid.');
  }
  const roots = resolveShopifyCliRuntimeStateRoot({ root, env });
  const normalized = normalizeScope(scope);
  ensureBoundedStateRoot(roots);
  const scopePath = path.join(roots.state_root, normalized.scope_id);
  ensurePrivateDirectory(scopePath);
  const directories = Object.fromEntries(['config', 'cache', 'state', 'data', 'temp'].map((name) => {
    const directory = path.join(scopePath, name);
    ensurePrivateDirectory(directory);
    return [name, directory];
  }));
  const policyDirectory = path.join(directories.config, AUTO_UPGRADE_PROJECT_DIRECTORY);
  ensurePrivateDirectory(policyDirectory);
  const policyFile = path.join(policyDirectory, AUTO_UPGRADE_CONFIGURATION_FILE);
  if (!fs.existsSync(policyFile)) atomicWriteJson(policyFile, { autoUpgradeEnabled: false });
  assertBoundedEntry(scopePath, policyFile);

  const commandEnvironment = Object.freeze({
    ...withoutShopifyStorefrontPassword(env),
    XDG_CONFIG_HOME: directories.config,
    XDG_CACHE_HOME: directories.cache,
    XDG_STATE_HOME: directories.state,
    XDG_DATA_HOME: directories.data,
    TMPDIR: directories.temp,
    SHOPIFY_CLI_NO_ANALYTICS: '1',
    OPT_OUT_INSTRUMENTATION: '1'
  });

  function attest() {
    for (const directory of [scopePath, ...Object.values(directories), policyDirectory]) {
      assertBoundedEntry(roots.state_root, directory);
      assertWritable(directory);
    }
    readAutoUpgradeConfiguration(policyFile);
    assertNoCredentialPersistence(scopePath, commandEnvironment);
    return {
      ready: true,
      runtime_state_revision: SHOPIFY_CLI_RUNTIME_STATE_REVISION,
      runtime_state_writable: true,
      auto_upgrade_state: 'off',
      credential_persistence: false,
      isolation: 'job_shop_scoped',
      lifecycle: 'reconstructable_ephemeral'
    };
  }

  function cleanup() {
    if (!isPathInside(roots.state_root, scopePath)) throw stateError('shopify_cli_runtime_state_path_unsafe', 'Shopify CLI runtime-state cleanup escaped its approved root.');
    fs.rmSync(scopePath, { recursive: true, force: true });
    return !fs.existsSync(scopePath);
  }

  function assertCredentialAbsent(value) {
    return assertCredentialValueAbsent(scopePath, value);
  }

  return Object.freeze({
    contract_version: SHOPIFY_CLI_RUNTIME_STATE_REVISION,
    scope_id: normalized.scope_id,
    binding: normalized.binding,
    environment: commandEnvironment,
    attest,
    assertCredentialAbsent,
    cleanup
  });
}

function assertShopifyCliRuntimeCredential(env = process.env) {
  if (!String(env.SHOPIFY_CLI_THEME_TOKEN || '').trim()) {
    throw stateError('shopify_cli_runtime_credentials_missing', 'Shopify CLI Theme Access credentials are unavailable for controlled rendering.');
  }
  return true;
}

module.exports = {
  SHOPIFY_CLI_RUNTIME_STATE_REVISION,
  AUTO_UPGRADE_PROJECT_DIRECTORY,
  AUTO_UPGRADE_CONFIGURATION_FILE,
  ShopifyCliRuntimeStateError,
  resolveShopifyCliRuntimeStateRoot,
  normalizeScope,
  ensureBoundedStateRoot,
  readAutoUpgradeConfiguration,
  credentialValues,
  stateFiles,
  assertNoCredentialPersistence,
  assertCredentialValueAbsent,
  initializeShopifyCliRuntimeState,
  assertShopifyCliRuntimeCredential
};
