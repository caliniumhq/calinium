'use strict';

const path = require('path');
const { spawn, spawnSync } = require('child_process');
const {
  parseShopifyCliVersionOutput,
  attestShopifyCliBuild
} = require('./shopify-cli-build-attestation');
const {
  SHOPIFY_CLI_RUNTIME_STATE_REVISION,
  initializeShopifyCliRuntimeState
} = require('./shopify-cli-runtime-state');
const { withoutShopifyStorefrontPassword } = require('./shopify-storefront-password-binding');

const SHOPIFY_CLI_RUNTIME_REVISION = 'shopify-cli-runtime-v1';
const SHOPIFY_CLI_JSON_OUTPUT_REVISION = 'shopify-cli-json-output-v1';
const PINNED_SHOPIFY_CLI_VERSION = '4.6.0';
const DEFAULT_COMMAND_TIMEOUT_MS = 30000;
const THEME_ROLES = new Set(['live', 'main', 'published', 'development', 'unpublished']);

class ShopifyCliRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ShopifyCliRuntimeError';
    this.code = code;
  }
}

function runtimeError(code, message) { return new ShopifyCliRuntimeError(code, message); }

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (role === 'live' || role === 'published' || role === 'main') return 'main';
  if (role === 'development') return 'development';
  if (role === 'unpublished') return 'unpublished';
  return null;
}

function canonicalThemeId(value) {
  const match = /^(?:gid:\/\/shopify\/OnlineStoreTheme\/)?([1-9]\d*)$/.exec(String(value || '').trim());
  return match ? match[1] : null;
}

function deterministicEnvironment(env = process.env, { allowStorefrontPassword = false } = {}) {
  return {
    ...(allowStorefrontPassword ? env : withoutShopifyStorefrontPassword(env)),
    CI: '1',
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    SHOPIFY_CLI_NO_ANALYTICS: '1'
  };
}

function normalizeProcessResult(result) {
  return {
    status: Number.isInteger(result?.status) ? result.status : null,
    signal: result?.signal || null,
    stdout: Buffer.isBuffer(result?.stdout) ? result.stdout.toString('utf8') : String(result?.stdout || ''),
    stderr: Buffer.isBuffer(result?.stderr) ? result.stderr.toString('utf8') : String(result?.stderr || ''),
    error: result?.error || null
  };
}

function executeDeterministicProcess({ command, args, cwd, env = process.env, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS, runner = spawnSync }) {
  let result;
  try {
    result = runner(command, args, {
      cwd,
      env: deterministicEnvironment(env),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      windowsHide: true,
      shell: false,
      killSignal: 'SIGTERM'
    });
  } catch (error) {
    result = { status: error.status ?? null, signal: error.signal || null, stdout: error.stdout, stderr: error.stderr, error };
  }
  return normalizeProcessResult(result);
}

function jsonEndAt(source, start) {
  const opening = source[start];
  if (opening !== '{' && opening !== '[') return -1;
  const stack = [opening];
  let inString = false;
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') { inString = true; continue; }
    if (character === '{' || character === '[') { stack.push(character); continue; }
    if (character === '}' || character === ']') {
      const expected = character === '}' ? '{' : '[';
      if (stack.at(-1) !== expected) return -1;
      stack.pop();
      if (!stack.length) return index + 1;
    }
  }
  return -1;
}

function recognizedShopifyChatter(value) {
  const text = String(value || '').replace(/\x1b\[[0-9;]*m/g, '').trim();
  if (!text) return false;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const updateMarker = lines.some((line) => /new version of shopify cli available|shopify cli.*updated|update available/i.test(line));
  if (!updateMarker) return false;
  const allowed = [
    /^(?:✨\s*)?new version of shopify cli available!?\s*\([0-9]+\.[0-9]+\.[0-9]+\s*(?:→|->)\s*[0-9]+\.[0-9]+\.[0-9]+\)$/i,
    /^update available(?:\s+for)?\s+shopify cli.*$/i,
    /^shopify cli.*(?:was |has been )?updated.*$/i,
    /^(?:to update|to upgrade|run)[:,]?\s+.*@shopify\/cli.*$/i,
    /^\$?\s*npm\s+(?:install|i)\s+(?:--global|-g)\s+@shopify\/cli(?:@[0-9]+\.[0-9]+\.[0-9]+)?$/i,
    /^npm (?:warn|notice)(?:\s+.*)?$/i,
    /^(?:added|removed|changed)\s+[0-9]+\s+packages?(?:,.*)?\s+in\s+.+$/i,
    /^[0-9]+\s+packages?\s+are\s+looking\s+for\s+funding$/i,
    /^run\s+[`']?npm fund[`']?\s+for\s+details$/i,
    /^[╭╰┌└][─-]+[╮╯┐┘]$/u,
    /^[│|].*(?:shopify cli|updated|version|success).*[│|]$/i,
    /^(?:success|done)[.!]?$/i
  ];
  return lines.every((line) => allowed.some((pattern) => pattern.test(line)));
}

function classifyExtraOutput(value) {
  if (!String(value || '').trim()) return 'whitespace';
  if (recognizedShopifyChatter(value)) return 'shopify_cli_update_chatter';
  return 'unknown';
}

function containsFatalShopifyDiagnostic(value) {
  return String(value || '').replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/)
    .some((line) => /^(?:error|failed|fatal|unauthorized|forbidden|access denied)\b/i.test(line.trim()));
}

function extractShopifyCliJson(stdout) {
  const source = String(stdout || '').replace(/^\uFEFF/, '');
  let candidate = null;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== '{' && source[index] !== '[') continue;
    const end = jsonEndAt(source, index);
    if (end < 0) continue;
    try {
      const data = JSON.parse(source.slice(index, end));
      candidate = { start: index, end, data };
      break;
    } catch {}
  }
  if (!candidate) throw runtimeError('shopify_cli_machine_output_invalid', 'Shopify CLI machine output did not contain one complete JSON payload.');
  const prefixClassification = classifyExtraOutput(source.slice(0, candidate.start));
  const suffix = source.slice(candidate.end);
  const suffixClassification = classifyExtraOutput(suffix);
  if (prefixClassification === 'unknown' || suffixClassification === 'unknown') {
    throw runtimeError('shopify_cli_machine_output_invalid', 'Shopify CLI machine output contained unrecognized bytes outside its JSON payload.');
  }
  return {
    contract_version: SHOPIFY_CLI_JSON_OUTPUT_REVISION,
    data: candidate.data,
    prefix_classification: prefixClassification,
    suffix_classification: suffixClassification,
    chatter_classification: [prefixClassification, suffixClassification].includes('shopify_cli_update_chatter')
      ? 'shopify_cli_update_chatter'
      : null
  };
}

function parseShopifyCliJsonResult(result, { validate = null } = {}) {
  const processResult = normalizeProcessResult(result);
  if (processResult.error || processResult.signal || processResult.status !== 0) {
    throw runtimeError('shopify_cli_execution_failed', 'Shopify CLI machine command did not complete successfully.');
  }
  if (containsFatalShopifyDiagnostic(processResult.stderr)) {
    throw runtimeError('shopify_cli_execution_failed', 'Shopify CLI reported a fatal diagnostic for a machine command.');
  }
  const stderrClassification = classifyExtraOutput(processResult.stderr);
  if (stderrClassification === 'unknown') {
    throw runtimeError('shopify_cli_machine_output_invalid', 'Shopify CLI emitted unrecognized diagnostic output for a machine command.');
  }
  const payload = extractShopifyCliJson(processResult.stdout);
  const data = typeof validate === 'function' ? validate(payload.data) : payload.data;
  return {
    ...payload,
    data,
    stderr_classification: stderrClassification,
    chatter_classification: payload.chatter_classification || (stderrClassification === 'shopify_cli_update_chatter' ? stderrClassification : null)
  };
}

function validateThemeListPayload(data) {
  const themes = Array.isArray(data) ? data : data?.themes || data?.data?.themes;
  if (!Array.isArray(themes)) throw runtimeError('shopify_theme_inventory_invalid', 'Shopify theme inventory has an unsupported response shape.');
  const seen = new Set();
  return themes.map((theme) => {
    if (!theme || typeof theme !== 'object' || Array.isArray(theme)) {
      throw runtimeError('shopify_theme_inventory_invalid', 'Shopify theme inventory contains an invalid theme record.');
    }
    const id = canonicalThemeId(theme.id);
    const name = typeof theme.name === 'string' ? theme.name.trim() : '';
    const sourceRole = String(theme.role || '').trim().toLowerCase();
    const role = normalizeRole(sourceRole);
    if (!id || !name || !THEME_ROLES.has(sourceRole) || !role || seen.has(id)) {
      throw runtimeError('shopify_theme_inventory_invalid', 'Shopify theme inventory contains incomplete, unsupported, or duplicate authority data.');
    }
    seen.add(id);
    return {
      id,
      name,
      role,
      preview_url: theme.preview_url || theme.previewUrl || null,
      updated_at: theme.updated_at || theme.updatedAt || null
    };
  });
}

function assertDevelopmentTarget(themes, themeId) {
  const expectedId = canonicalThemeId(themeId);
  const target = themes.find((theme) => theme.id === expectedId);
  if (!target) throw runtimeError('shopify_development_target_not_found', 'The configured Shopify development target is absent from the verified inventory.');
  if (target.role !== 'development') throw runtimeError('shopify_development_target_role_invalid', 'The configured Shopify render target is not a development theme.');
  const main = themes.find((theme) => theme.role === 'main');
  if (!main || main.id === target.id) throw runtimeError('shopify_development_target_role_invalid', 'Shopify MAIN and DEVELOPMENT authority could not be proven distinct.');
  return target;
}

function parseVersion(result) {
  const processResult = normalizeProcessResult(result);
  if (processResult.error || processResult.signal || processResult.status !== 0 || processResult.stderr.trim()) {
    throw runtimeError('shopify_cli_execution_failed', 'Shopify CLI version attestation did not complete successfully.');
  }
  try { return parseShopifyCliVersionOutput(processResult.stdout); }
  catch { throw runtimeError('shopify_cli_version_mismatch', 'Shopify CLI returned an invalid version attestation.'); }
}

function createShopifyCliRuntime({
  root,
  env = process.env,
  command = null,
  expectedVersion = null,
  expectedMainThemeId = null,
  runner = spawnSync,
  spawnProcess = spawn,
  commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
  runtimeStateFactory = initializeShopifyCliRuntimeState,
  buildAttestor = attestShopifyCliBuild
} = {}) {
  const repositoryRoot = path.resolve(root || path.join(__dirname, '../..'));
  const executable = command || env.CALINIUM_SHOPIFY_CLI || path.join(repositoryRoot, 'node_modules', '.bin', 'shopify');
  const expected = expectedVersion || env.CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION || PINNED_SHOPIFY_CLI_VERSION;
  const configuredMainThemeId = expectedMainThemeId || env.CALINIUM_SHOPIFY_MAIN_THEME_ID || null;
  const expectedMain = configuredMainThemeId ? canonicalThemeId(configuredMainThemeId) : null;
  const baseEnvironment = withoutShopifyStorefrontPassword(env);
  if (expected !== PINNED_SHOPIFY_CLI_VERSION) {
    throw runtimeError('shopify_cli_version_mismatch', 'Configured Shopify CLI version does not match the source-pinned runtime contract.');
  }
  if (configuredMainThemeId && !expectedMain) {
    throw runtimeError('shopify_theme_inventory_invalid', 'Configured Shopify MAIN theme identity is invalid.');
  }
  let readinessVersion = null;

  function execute(args, { cwd = repositoryRoot, timeoutMs = commandTimeoutMs, commandEnv = baseEnvironment } = {}) {
    return executeDeterministicProcess({ command: executable, args, cwd, env: commandEnv, timeoutMs, runner });
  }

  function readVersion() { return parseVersion(execute(['version'])); }

  function requireExpected(actual) {
    if (actual !== expected) throw runtimeError('shopify_cli_version_mismatch', 'Installed Shopify CLI version does not match the approved runtime contract.');
    return actual;
  }

  function attestReadiness() {
    const actual = requireExpected(readVersion());
    readinessVersion = actual;
    return { ready: true, runtime_revision: SHOPIFY_CLI_RUNTIME_REVISION, expected_version: expected, actual_version: actual };
  }

  function attestRuntimeStateReadiness() {
    const runtime = attestReadiness();
    const immutable = buildAttestor({
      root: repositoryRoot,
      env: baseEnvironment,
      command: executable,
      configureAutoUpgrade: false,
      verifyImmutable: true
    });
    if (immutable.runtime_filesystem !== 'read_only') {
      throw runtimeError('shopify_cli_runtime_immutability_failed', 'Shopify CLI dependency or policy configuration is writable by the runtime user.');
    }
    let state = null;
    try {
      state = runtimeStateFactory({
        root: repositoryRoot,
        env: baseEnvironment,
        scope: { kind: 'readiness', job_id: 'controlled-readiness', shop_domain: null }
      });
      const runtimeState = state.attest();
      return {
        ...runtime,
        runtime_state_revision: SHOPIFY_CLI_RUNTIME_STATE_REVISION,
        runtime_state_writable: runtimeState.runtime_state_writable === true,
        package_immutable: immutable.runtime_filesystem === 'read_only',
        auto_upgrade_state: runtimeState.auto_upgrade_state
      };
    } finally { state?.cleanup(); }
  }

  function assertRenderReady() {
    const actual = readVersion();
    if (readinessVersion && actual !== readinessVersion) {
      throw runtimeError('shopify_cli_runtime_drift', 'Shopify CLI version changed after readiness attestation.');
    }
    requireExpected(actual);
    readinessVersion ||= actual;
    return actual;
  }

  function assertStable(before) {
    const after = readVersion();
    if (after !== before || after !== readinessVersion || after !== expected) {
      throw runtimeError('shopify_cli_runtime_drift', 'Shopify CLI version changed during a controlled operation.');
    }
    return after;
  }

  function runJson(args, { cwd = repositoryRoot, validate = null, commandEnv = baseEnvironment } = {}) {
    const before = assertRenderReady();
    const result = execute(args, { cwd, commandEnv });
    const parsed = parseShopifyCliJsonResult(result, { validate });
    assertStable(before);
    return parsed;
  }

  function listThemes(store, options = {}) {
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(String(store || ''))) {
      throw runtimeError('shopify_theme_inventory_invalid', 'Shopify theme inventory requires a canonical shop domain.');
    }
    const shopDomain = String(store).toLowerCase();
    if (options.commandEnv) {
      return runJson(['theme', 'list', '--store', shopDomain, '--json', '--no-color'], {
        ...options,
        validate: validateThemeListPayload
      });
    }
    let state = null;
    try {
      state = runtimeStateFactory({
        root: repositoryRoot,
        env: baseEnvironment,
        scope: options.runtimeStateScope || {
          kind: 'inventory',
          job_id: `process-${process.pid}`,
          shop_domain: shopDomain
        }
      });
      state.attest();
      const result = runJson(['theme', 'list', '--store', shopDomain, '--json', '--no-color'], {
        ...options,
        commandEnv: state.environment,
        validate: validateThemeListPayload
      });
      state.attest();
      return result;
    } finally { state?.cleanup(); }
  }

  function requireDevelopmentTarget(themes, themeId) {
    const target = assertDevelopmentTarget(themes, themeId);
    const main = themes.find((theme) => theme.role === 'main');
    if (expectedMain && main?.id !== expectedMain) {
      throw runtimeError('shopify_development_target_role_invalid', 'Verified Shopify MAIN authority does not match the configured runtime contract.');
    }
    return target;
  }

  function spawnCommand(args, { cwd = repositoryRoot, commandEnv = baseEnvironment, allowStorefrontPassword = false } = {}) {
    if (allowStorefrontPassword && (!Array.isArray(args) || args[0] !== 'theme' || args[1] !== 'dev')) {
      throw Object.assign(runtimeError(
        'controlled_beta_storefront_password_binding_child_command_invalid',
        'Storefront-password forwarding is restricted to the Shopify theme development child.'
      ), { retryable: false });
    }
    if (allowStorefrontPassword && args.some((value) => String(value) === '--store-password' || String(value).startsWith('--store-password='))) {
      throw Object.assign(runtimeError(
        'controlled_beta_storefront_password_binding_argv_forbidden',
        'Storefront-password forwarding through argv is forbidden.'
      ), { retryable: false });
    }
    assertRenderReady();
    return spawnProcess(executable, args, {
      cwd,
      env: deterministicEnvironment(commandEnv, { allowStorefrontPassword }),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true
    });
  }

  return {
    runtime_revision: SHOPIFY_CLI_RUNTIME_REVISION,
    json_output_revision: SHOPIFY_CLI_JSON_OUTPUT_REVISION,
    expected_version: expected,
    expected_main_theme_id: expectedMain,
    attestReadiness,
    attestRuntimeStateReadiness,
    assertRenderReady,
    assertStable,
    execute,
    runJson,
    listThemes,
    assertDevelopmentTarget: requireDevelopmentTarget,
    spawn: spawnCommand
  };
}

module.exports = {
  SHOPIFY_CLI_RUNTIME_REVISION,
  SHOPIFY_CLI_JSON_OUTPUT_REVISION,
  PINNED_SHOPIFY_CLI_VERSION,
  DEFAULT_COMMAND_TIMEOUT_MS,
  ShopifyCliRuntimeError,
  normalizeRole,
  canonicalThemeId,
  deterministicEnvironment,
  executeDeterministicProcess,
  recognizedShopifyChatter,
  classifyExtraOutput,
  containsFatalShopifyDiagnostic,
  extractShopifyCliJson,
  parseShopifyCliJsonResult,
  validateThemeListPayload,
  assertDevelopmentTarget,
  parseVersion,
  createShopifyCliRuntime
};
