'use strict';

const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { isPathInside } = require('../theme-generator/utils');
const { sha256File, redactSensitiveText } = require('./contracts');
const {
  createShopifyCliRuntime,
  validateThemeListPayload
} = require('./shopify-cli-runtime');
const {
  initializeShopifyCliRuntimeState,
  assertShopifyCliRuntimeCredential
} = require('./shopify-cli-runtime-state');
const {
  SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION,
  withoutShopifyStorefrontPassword
} = require('./shopify-storefront-password-binding');

const ALLOWED_THEME_ROOTS = new Set(['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates']);
const FORBIDDEN_THEME_DEV_FLAGS = new Set(['--allow-live', '--live', '--publish', '--theme-editor-sync', '--store-password']);

function safeText(value, maximum = 4000) {
  return redactSensitiveText(value).replace(/\x1b\[[0-9;]*m/g, '').replace(/[\r\n]+/g, ' ').trim().slice(0, maximum);
}

function archiveEntries(archivePath, runner = execFileSync, env = process.env) {
  return runner('unzip', ['-Z1', archivePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: withoutShopifyStorefrontPassword(env)
  })
    .split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
}

function validateArchiveEntries(entries) {
  const errors = [];
  for (const entry of entries) {
    const normalized = entry.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    if (!parts.length || normalized.startsWith('/') || parts.includes('..')) errors.push(`Unsafe archive entry ${entry}.`);
    else if (!ALLOWED_THEME_ROOTS.has(parts[0])) errors.push(`Unsupported theme archive root ${parts[0]}.`);
    if (normalized.endsWith('.DS_Store')) errors.push(`Forbidden development artifact ${entry}.`);
  }
  return [...new Set(errors)].sort();
}

function validateThemeDirectory(themeDirectory) {
  const required = ['layout/theme.liquid', 'config/settings_schema.json', 'config/settings_data.json', 'templates/index.json'];
  const missing = required.filter((relative) => !fs.existsSync(path.join(themeDirectory, relative)));
  if (missing.length) throw new Error(`Generated theme source is incomplete: ${missing.join(', ')}.`);
  return true;
}

function prepareThemeSource({ root, request, runner = execFileSync, env = process.env }) {
  const outputRoot = path.resolve(root, 'output');
  const archivePath = path.resolve(root, request.generation.artifact.source_reference);
  if (!isPathInside(outputRoot, archivePath)) throw new Error('Generated theme archive must remain inside output/.');
  if (!fs.existsSync(archivePath) || !fs.statSync(archivePath).isFile()) throw new Error('Generated theme archive is unavailable.');
  if (sha256File(archivePath) !== request.generation.artifact.sha256) throw new Error('Generated theme archive integrity verification failed.');
  const commandEnvironment = withoutShopifyStorefrontPassword(env);
  const entries = archiveEntries(archivePath, runner, commandEnvironment);
  const entryErrors = validateArchiveEntries(entries);
  if (entryErrors.length) throw new Error(`Generated theme archive is unsafe: ${entryErrors.join(' ')}`);
  const workspace = path.join(outputRoot, '.storefront-render-workspaces', `${request.request_id}-${process.pid}`);
  const themeDirectory = path.join(workspace, 'theme');
  if (fs.existsSync(workspace)) throw new Error('Storefront render workspace already exists.');
  fs.mkdirSync(themeDirectory, { recursive: true });
  try {
    runner('unzip', ['-q', archivePath, '-d', themeDirectory], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: commandEnvironment
    });
    validateThemeDirectory(themeDirectory);
  } catch (error) {
    fs.rmSync(workspace, { recursive: true, force: true });
    throw error;
  }
  return {
    archive_path: archivePath,
    workspace,
    theme_directory: themeDirectory,
    archive_entry_count: entries.filter((entry) => !entry.endsWith('/')).length,
    cleanup() {
      if (fs.existsSync(workspace)) fs.rmSync(workspace, { recursive: true, force: true });
      return !fs.existsSync(workspace);
    }
  };
}

function assertSafeThemeDevArgs(args, { exactDevelopmentThemeId = null } = {}) {
  for (const flag of FORBIDDEN_THEME_DEV_FLAGS) {
    if (args.some((value) => String(value) === flag || String(value).startsWith(`${flag}=`))) {
      throw new Error(`Storefront render runtime forbids Shopify CLI flag ${flag}.`);
    }
  }
  if (!args.includes('--live-reload') || args[args.indexOf('--live-reload') + 1] !== 'off') throw new Error('Storefront render runtime requires live reload to be disabled.');
  const themeIndex = args.indexOf('--theme');
  if (themeIndex !== -1 && (!/^[1-9][0-9]*$/.test(String(exactDevelopmentThemeId || ''))
    || String(args[themeIndex + 1] || '') !== String(exactDevelopmentThemeId))) {
    throw new Error('Storefront render runtime cannot target an arbitrary existing theme.');
  }
  return args;
}

function localReady(url, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.on('timeout', () => { request.destroy(); resolve(false); });
    request.on('error', () => resolve(false));
  });
}

function parseRuntimeOutput(output, expectedStore) {
  const local = output.match(/http:\/\/127\.0\.0\.1:[0-9]+/i)?.[0] || null;
  const remotes = output.match(/https:\/\/[a-z0-9-]+\.myshopify\.com\/\?preview_theme_id=[0-9]+/gi) || [];
  const remote = remotes.find((candidate) => new URL(candidate).hostname === expectedStore) || null;
  if (!local || !remote) return null;
  const previewUrl = new URL(remote);
  return { local_origin: new URL(local).origin, remote_preview_url: previewUrl.toString(), theme_id: previewUrl.searchParams.get('preview_theme_id') };
}

function listThemes(store, runtime, options = {}) {
  if (!runtime || typeof runtime.listThemes !== 'function') throw new Error('Shopify CLI runtime is required for theme inventory.');
  return runtime.listThemes(store, options).data;
}

function waitForProcessExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.removeListener('exit', onExit);
      resolve(value);
    };
    const onExit = () => finish(true);
    timer = setTimeout(() => finish(false), timeoutMs);
    child.once('exit', onExit);
  });
}

async function stopChildProcess(child, timings = {}) {
  const interruptMs = timings.interrupt_ms ?? 3000;
  const terminateMs = timings.terminate_ms ?? 2000;
  const killMs = timings.kill_ms ?? 1000;
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return true;
  child.kill('SIGINT');
  if (await waitForProcessExit(child, interruptMs)) return true;
  child.kill('SIGTERM');
  if (await waitForProcessExit(child, terminateMs)) return true;
  child.kill('SIGKILL');
  return waitForProcessExit(child, killMs);
}

function storefrontPasswordRuntimeError(code, message, { retryable = false } = {}) {
  return Object.assign(new Error(message), { code, retryable });
}

function storefrontRuntimeCancellationError(signal) {
  const reason = signal?.reason;
  const safeReasonCode = /^[a-z][a-z0-9_]{2,100}$/.test(String(reason?.code || ''))
    ? reason.code
    : 'merchant_flow_job_cancelled';
  return storefrontPasswordRuntimeError(
    safeReasonCode,
    safeReasonCode === 'merchant_flow_job_cancelled'
      ? 'Merchant storefront rendering was cancelled.'
      : 'Merchant storefront rendering was interrupted by a bounded lifecycle check.',
    { retryable: safeReasonCode === 'merchant_flow_job_cancelled' ? false : reason?.retryable === true }
  );
}

function assertStorefrontRuntimeNotAborted(signal) {
  if (signal?.aborted) throw storefrontRuntimeCancellationError(signal);
  return true;
}

function finalizeStorefrontRuntimeResources({ runtimeState, storefrontPasswordBinding }) {
  let failed = false;
  try { runtimeState?.cleanup(); }
  catch { failed = true; }
  try { storefrontPasswordBinding?.release(); }
  catch { failed = true; }
  if (failed) {
    throw storefrontPasswordRuntimeError(
      'controlled_beta_storefront_password_binding_finalization_failed',
      'Storefront-password runtime resources could not be finalized safely.',
      { retryable: false }
    );
  }
  return true;
}

function deferredIntegrityCode(error) {
  return /credential_persistence|persistence_detected/.test(String(error?.code || ''))
    ? 'controlled_beta_storefront_password_binding_persistence_detected'
    : 'controlled_beta_storefront_password_binding_deferred_integrity_failed';
}

function deferStorefrontRuntimeResourceFinalization({
  child,
  runtimeState,
  storefrontPasswordBinding,
  verifyLifecycle,
  reportIntegrityFailure = () => {}
}) {
  let finalized = false;
  let resolveCompletion;
  const completion = new Promise((resolve) => { resolveCompletion = resolve; });
  const finalize = () => {
    if (finalized) return false;
    finalized = true;
    let integrityFailure = null;
    try { verifyLifecycle?.(); } catch (error) { integrityFailure = error; }
    try { runtimeState?.attest(); } catch (error) { integrityFailure ||= error; }
    const integrityCode = integrityFailure ? deferredIntegrityCode(integrityFailure) : null;
    if (integrityCode) {
      try { reportIntegrityFailure(Object.freeze({ code: integrityCode, retryable: false })); } catch {}
    }
    let finalizationCode = null;
    try { finalizeStorefrontRuntimeResources({ runtimeState, storefrontPasswordBinding }); }
    catch { finalizationCode = 'controlled_beta_storefront_password_binding_finalization_failed'; }
    resolveCompletion(Object.freeze({
      status: integrityCode || finalizationCode ? 'failed' : 'finalized',
      reason_code: integrityCode || finalizationCode
    }));
    return true;
  };
  if (!child || child.exitCode !== null || child.signalCode !== null) finalize();
  else child.once('exit', finalize);
  return Object.freeze({ pending: !finalized, completion, finalize });
}

const deferredStorefrontRuntimeIntegrityIncidents = [];
function recordDeferredStorefrontRuntimeIntegrityIncident(scope, failure) {
  const incident = Object.freeze({
    incident_revision: 'shopify-storefront-password-integrity-incident-v1',
    code: deferredIntegrityCode(failure),
    retryable: false,
    shop_domain: scope.shopDomain,
    operation_id: scope.operationId
  });
  deferredStorefrontRuntimeIntegrityIncidents.push(incident);
  if (deferredStorefrontRuntimeIntegrityIncidents.length > 64) deferredStorefrontRuntimeIntegrityIncidents.shift();
  try { process.emit('caliniumStorefrontRuntimeIntegrityIncident', incident); } catch {}
  return incident;
}

function readDeferredStorefrontRuntimeIntegrityIncidents() {
  return deferredStorefrontRuntimeIntegrityIncidents.map((incident) => ({ ...incident }));
}

function storefrontRuntimeFailurePriority(error) {
  if (String(error?.code || '').startsWith('controlled_beta_storefront_password_binding_') && error?.retryable === false) return 3;
  if (error?.retryable === false) return 2;
  return 1;
}

function preferStorefrontRuntimeFailure(current, candidate) {
  if (!candidate) return current;
  if (!current || storefrontRuntimeFailurePriority(candidate) > storefrontRuntimeFailurePriority(current)) return candidate;
  return current;
}

function preflightStorefrontPasswordBinding(factory, scope) {
  if (typeof factory !== 'function') {
    throw storefrontPasswordRuntimeError(
      'controlled_beta_storefront_password_binding_required',
      'Exact storefront rendering requires a bounded storefront-password binding.'
    );
  }
  let binding = null;
  try {
    binding = factory(scope);
    if (!binding
      || binding.contract_version !== SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION
      || binding.shop_domain !== scope.shopDomain
      || binding.operation_id !== scope.operationId
      || !['READY', 'NOT_REQUIRED'].includes(binding.status)
      || typeof binding.assertScope !== 'function'
      || typeof binding.childEnvironment !== 'function'
      || typeof binding.assertNoPersistence !== 'function'
      || typeof binding.release !== 'function') {
      throw storefrontPasswordRuntimeError(
        'controlled_beta_storefront_password_binding_invalid',
        'Exact storefront rendering received an invalid storefront-password binding.'
      );
    }
    binding.assertScope(scope);
    return binding;
  } catch (error) {
    try { binding?.release?.(); } catch {}
    if (error?.code === 'shopify_storefront_password_required') {
      throw storefrontPasswordRuntimeError(
        error.code,
        'The password-protected Shopify storefront requires configured preview authentication.',
        { retryable: true }
      );
    }
    if (String(error?.code || '').startsWith('controlled_beta_storefront_password_binding_')) {
      throw storefrontPasswordRuntimeError(
        error.code,
        'Storefront-password binding validation failed closed.',
        { retryable: false }
      );
    }
    throw storefrontPasswordRuntimeError(
      'controlled_beta_storefront_password_binding_invalid',
      'Exact storefront rendering could not establish a valid storefront-password binding.'
    );
  }
}

function assertStorefrontPasswordLifecycle(binding, runtimeState, scope) {
  if (!binding) return true;
  try {
    binding.assertScope(scope);
    binding.assertNoPersistence(runtimeState, scope);
    return true;
  } catch (error) {
    if (String(error?.code || '').startsWith('controlled_beta_storefront_password_binding_')) {
      throw storefrontPasswordRuntimeError(
        error.code,
        'Storefront-password lifecycle verification failed closed.',
        { retryable: false }
      );
    }
    throw storefrontPasswordRuntimeError(
      'controlled_beta_storefront_password_binding_lifecycle_invalid',
      'Storefront-password lifecycle verification failed closed.'
    );
  }
}

async function startShopifyDevelopmentRuntime({
  root,
  request,
  themeDirectory,
  port = 9294,
  startupTimeoutMs = 120000,
  spawnProcess = spawn,
  shopifyCliRuntime = null,
  runtimeStateFactory = initializeShopifyCliRuntimeState,
  storefrontPasswordBindingFactory = null,
  abortSignal = null,
  shutdownTimings = {},
  exactDevelopmentTarget = false,
  env = process.env
}) {
  const bindingScope = Object.freeze({
    shopDomain: request.target.shop_domain,
    operationId: request.request_id
  });
  const runtimeEnvironment = withoutShopifyStorefrontPassword(env);
  let storefrontPasswordBinding = null;
  let runtimeState = null;
  let commandEnvironment = null;
  let cli = null;
  let versionBefore = null;
  let preverifiedTarget = null;
  let child = null;
  let stdout = '';
  let stderr = '';
  let exited = null;
  let args = null;
  let parsed = null;
  let target;
  let abortStopPromise = null;
  let deferredFinalization = null;
  let resourcesFinalized = false;
  const finalizeResources = () => {
    if (resourcesFinalized) return false;
    const finalized = finalizeStorefrontRuntimeResources({ runtimeState, storefrontPasswordBinding });
    resourcesFinalized = true;
    return finalized;
  };
  const deferFinalization = () => {
    if (deferredFinalization || resourcesFinalized) return deferredFinalization;
    deferredFinalization = deferStorefrontRuntimeResourceFinalization({
      child,
      runtimeState,
      storefrontPasswordBinding,
      verifyLifecycle: () => assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope),
      reportIntegrityFailure: (failure) => recordDeferredStorefrontRuntimeIntegrityIncident(bindingScope, failure)
    });
    return deferredFinalization;
  };
  const ensureChildStop = () => {
    if (!child) return Promise.resolve(true);
    if (!abortStopPromise) abortStopPromise = Promise.resolve().then(() => stopChildProcess(child, shutdownTimings));
    return abortStopPromise;
  };
  const stopForAbort = () => { void ensureChildStop().catch(() => {}); };
  abortSignal?.addEventListener?.('abort', stopForAbort, { once: true });
  try {
    assertStorefrontRuntimeNotAborted(abortSignal);
    if (exactDevelopmentTarget) {
      storefrontPasswordBinding = preflightStorefrontPasswordBinding(storefrontPasswordBindingFactory, bindingScope);
      if (env.CALINIUM_MERCHANT_FLOW_BETA_ENABLED === 'true') assertShopifyCliRuntimeCredential(env);
    }
    assertStorefrontRuntimeNotAborted(abortSignal);
    runtimeState = runtimeStateFactory({
      root,
      env: runtimeEnvironment,
      scope: {
        kind: 'render',
        job_id: request.request_id,
        shop_domain: request.target.shop_domain
      }
    });
    assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
    runtimeState.attest();
    assertStorefrontRuntimeNotAborted(abortSignal);
    commandEnvironment = runtimeState.environment;
    cli = shopifyCliRuntime || createShopifyCliRuntime({ root, env: runtimeEnvironment, spawnProcess });
    if (exactDevelopmentTarget) {
      if (typeof cli.attestRuntimeStateReadiness !== 'function') {
        throw new Error('Exact storefront rendering requires immutable Shopify CLI runtime-state attestation.');
      }
      const readiness = cli.attestRuntimeStateReadiness();
      if (readiness.package_immutable !== true || readiness.runtime_state_writable !== true || readiness.auto_upgrade_state !== 'off') {
        throw new Error('Exact storefront rendering requires an immutable package and writable policy-compliant runtime state.');
      }
      versionBefore = readiness.actual_version;
      assertStorefrontRuntimeNotAborted(abortSignal);
      if (request.target.expected_theme_role !== 'development' || !/^[1-9][0-9]*$/.test(String(request.target.theme_id || ''))) {
        throw new Error('Exact storefront rendering requires a pinned Shopify development theme.');
      }
      assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
      preverifiedTarget = cli.assertDevelopmentTarget(listThemes(request.target.shop_domain, cli, { commandEnv: commandEnvironment }), request.target.theme_id);
      runtimeState.attest();
      assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
      assertStorefrontRuntimeNotAborted(abortSignal);
    } else versionBefore = cli.assertRenderReady();
    args = assertSafeThemeDevArgs([
      'theme', 'dev', '--path', themeDirectory, '--store', request.target.shop_domain,
      ...(exactDevelopmentTarget ? ['--theme', request.target.theme_id] : []),
      '--live-reload', 'off', '--host', '127.0.0.1', '--port', String(port), '--no-color'
    ], { exactDevelopmentThemeId: exactDevelopmentTarget ? request.target.theme_id : null });
    let childEnvironment = commandEnvironment;
    if (storefrontPasswordBinding) {
      childEnvironment = storefrontPasswordBinding.childEnvironment(commandEnvironment, {
        ...bindingScope,
        commandArgs: args
      });
    }
    assertStorefrontRuntimeNotAborted(abortSignal);
    try {
      child = cli.spawn(args, {
        cwd: themeDirectory,
        commandEnv: childEnvironment,
        allowStorefrontPassword: storefrontPasswordBinding?.status === 'READY'
      });
    } finally { childEnvironment = null; }
    if (abortSignal?.aborted) stopForAbort();
    assertStorefrontRuntimeNotAborted(abortSignal);
    assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
    const appendStdout = (chunk) => { stdout = `${stdout}${chunk.toString()}`.slice(-32768); };
    const appendStderr = (chunk) => { stderr = `${stderr}${chunk.toString()}`.slice(-32768); };
    child.stdout?.on('data', appendStdout);
    child.stderr?.on('data', appendStderr);
    child.once('exit', (code, signal) => { exited = { code, signal }; });
    child.once('error', (error) => { exited = { code: null, signal: null, error: safeText(error.message) }; });
    const deadline = Date.now() + startupTimeoutMs;
    while (Date.now() < deadline) {
      assertStorefrontRuntimeNotAborted(abortSignal);
      assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
      if (exited) throw new Error(`Shopify development runtime exited before readiness: ${exited.error || `exit ${exited.code ?? 'unknown'}`}.`);
      parsed = parseRuntimeOutput(`${stdout}\n${stderr}`, request.target.shop_domain);
      if (parsed && await localReady(`${parsed.local_origin}/`)) break;
      assertStorefrontRuntimeNotAborted(abortSignal);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assertStorefrontRuntimeNotAborted(abortSignal);
    if (!parsed || !(await localReady(`${parsed.local_origin}/`))) {
      throw new Error('Shopify development runtime did not become ready with a verified local and remote preview identity.');
    }
    assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
    let themes;
    try { themes = listThemes(request.target.shop_domain, cli, { commandEnv: commandEnvironment }); }
    catch (error) { throw Object.assign(new Error('Shopify development theme identity could not be verified.'), { code: error.code || 'shopify_theme_inventory_invalid' }); }
    runtimeState.attest();
    assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
    target = cli.assertDevelopmentTarget(validateThemeListPayload(themes), parsed.theme_id);
    if (preverifiedTarget && (target.id !== preverifiedTarget.id || target.role !== preverifiedTarget.role)) {
      throw new Error('Shopify development runtime changed from its exact preverified target.');
    }
    if (target.role !== request.target.expected_theme_role) {
      throw new Error(`Shopify development runtime returned role ${target.role}, expected ${request.target.expected_theme_role}.`);
    }
    cli.assertStable(versionBefore);
  } catch (error) {
    let failure = error;
    let stopped = child ? false : true;
    if (child) {
      try { stopped = await ensureChildStop(); }
      catch (stopError) { failure = preferStorefrontRuntimeFailure(failure, stopError); }
    }
    try {
      if (runtimeState) {
        assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
        runtimeState.attest();
        assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
      }
    } catch (integrityError) { failure = preferStorefrontRuntimeFailure(failure, integrityError); }
    let finalizationFailure = null;
    try {
      if (stopped) finalizeResources(); else deferFinalization();
    } catch (finalizeError) { finalizationFailure = finalizeError; }
    finally {
      abortSignal?.removeEventListener?.('abort', stopForAbort);
    }
    failure = preferStorefrontRuntimeFailure(failure, finalizationFailure);
    if (!stopped) {
      throw storefrontPasswordRuntimeError(
        'controlled_beta_storefront_password_binding_shutdown_failed',
        `${safeText(failure.message)} Shopify development runtime could not be stopped safely.`,
        { retryable: false }
      );
    }
    throw failure;
  }
  return {
    mode: request.target.runtime_mode,
    shop_domain: request.target.shop_domain,
    theme_id: target.id,
    theme_name: target.name,
    theme_role: target.role,
    remote_preview_url: parsed.remote_preview_url,
    local_proxy_origin: parsed.local_origin,
    args: [...args],
    async stop() {
      let stopped = false;
      let failure = null;
      try { assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope); }
      catch (error) { failure = preferStorefrontRuntimeFailure(failure, error); }
      try { stopped = await ensureChildStop(); }
      catch (error) { failure = preferStorefrontRuntimeFailure(failure, error); }
      if (stopped) {
        try {
          cli.assertStable(versionBefore);
          runtimeState.attest();
          assertStorefrontPasswordLifecycle(storefrontPasswordBinding, runtimeState, bindingScope);
        } catch (error) { failure = preferStorefrontRuntimeFailure(failure, error); }
      }
      let finalizationFailure = null;
      try {
        if (stopped) finalizeResources(); else deferFinalization();
      } catch (error) { finalizationFailure = error; }
      finally {
        abortSignal?.removeEventListener?.('abort', stopForAbort);
      }
      failure = preferStorefrontRuntimeFailure(failure, finalizationFailure);
      if (!stopped) return false;
      if (failure) throw failure;
      return true;
    }
  };
}

module.exports = {
  ALLOWED_THEME_ROOTS,
  FORBIDDEN_THEME_DEV_FLAGS,
  safeText,
  archiveEntries,
  validateArchiveEntries,
  validateThemeDirectory,
  prepareThemeSource,
  assertSafeThemeDevArgs,
  parseRuntimeOutput,
  listThemes,
  waitForProcessExit,
  stopChildProcess,
  preflightStorefrontPasswordBinding,
  assertStorefrontPasswordLifecycle,
  assertStorefrontRuntimeNotAborted,
  finalizeStorefrontRuntimeResources,
  deferStorefrontRuntimeResourceFinalization,
  readDeferredStorefrontRuntimeIntegrityIncidents,
  preferStorefrontRuntimeFailure,
  startShopifyDevelopmentRuntime
};
