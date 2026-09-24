'use strict';

const fs = require('fs');
const path = require('path');
const { sourceSnapshot, sameSnapshot, isPathInside } = require('../theme-generator/utils');
const { prepareThemeSource, startShopifyDevelopmentRuntime } = require('./shopify-development-runtime');
const { createPlaywrightCaptureDriver } = require('./playwright-capture-driver');
const { digest, sha256File } = require('./contracts');
const {
  resolveRouteArchitectureEvidence,
  MERCHANT_RENDER_RESULT_VERSION,
  MERCHANT_RENDER_REVISION,
  assertMerchantFlowRenderRequest,
  merchantRenderIdFor,
  merchantScreenshotReference,
  assertMerchantFlowRenderResult
} = require('./merchant-flow-contracts');
const { emptyReadiness, emptyObservations, safeFailureMessage, runtimeRecord } = require('./capture-harness');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

function destinationFor(root, request) {
  const renderRoot = path.resolve(root, 'output', 'merchant-flow-storefront-renders');
  const destination = path.resolve(renderRoot, request.request_id);
  if (!isPathInside(renderRoot, destination) || path.basename(destination) !== request.request_id) throw new Error('Merchant render output escaped its bounded evidence directory.');
  return destination;
}

function retryArchiveRootFor(root, request) {
  const outputRoot = path.resolve(root, 'output');
  const archiveRoot = path.resolve(outputRoot, 'merchant-flow-storefront-render-attempts', request.request_id);
  if (!isPathInside(outputRoot, archiveRoot) || path.basename(archiveRoot) !== request.request_id) throw new Error('Merchant render retry archive escaped output/.');
  return archiveRoot;
}

function archiveRetryableMerchantRender({ root, request, destination, now }) {
  const requestFile = path.join(destination, 'render-request.json');
  const manifestFile = path.join(destination, 'render-manifest.json');
  const entries = fs.readdirSync(destination);
  let state = 'empty_crash_partial';
  if (fs.existsSync(requestFile)) {
    const storedRequest = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
    if (digest(storedRequest) !== digest(request)) throw new Error('Existing merchant render evidence belongs to another canonical request.');
    state = 'request_bound_crash_partial';
  } else if (entries.length) {
    throw new Error('Existing merchant render evidence is not bound to the canonical request.');
  }
  if (fs.existsSync(manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    if (manifest.request_id !== request.request_id || manifest.request_checksum !== digest(request)) throw new Error('Existing merchant render manifest belongs to another canonical request.');
    if (manifest.status === 'passed') throw new Error('Passed merchant render evidence failed validation and cannot be replaced automatically.');
    if (manifest.status !== 'failed') throw new Error('Existing merchant render manifest has an unsupported state.');
    state = 'failed_manifest';
  }
  const archiveRoot = retryArchiveRootFor(root, request);
  fs.mkdirSync(archiveRoot, { recursive: true });
  let sequence = 1;
  let archiveDirectory;
  do {
    archiveDirectory = path.join(archiveRoot, `attempt-${String(sequence).padStart(4, '0')}`);
    sequence += 1;
  } while (fs.existsSync(archiveDirectory));
  fs.renameSync(destination, archiveDirectory);
  writeJson(path.join(archiveDirectory, 'retry-archive.json'), {
    schema_version: '1.0',
    archive_revision: 'merchant-flow-render-retry-archive-v1',
    request_id: request.request_id,
    request_checksum: digest(request),
    prior_state: state,
    archived_at: now()
  });
  return archiveDirectory;
}

function failedEvidence(error, root) {
  return {
    status: 'failed', final_url: null, screenshot: null,
    readiness: emptyReadiness(), architecture_evidence: null,
    browser_observations: emptyObservations(),
    deterministic_validation: { valid: false, checks: [{ id: 'capture_completed', passed: false }] },
    error: { code: 'merchant_storefront_capture_failed', message: safeFailureMessage(error, root) }
  };
}

function buildMerchantRenderResult({ request, route, viewport, runtime, browser, evidence, renderedAt }) {
  const screenshotReference = merchantScreenshotReference(request, route, viewport);
  return {
    schema_version: '1.0',
    contract_version: MERCHANT_RENDER_RESULT_VERSION,
    render_id: merchantRenderIdFor(request, route, viewport),
    request_id: request.request_id,
    render_revision: MERCHANT_RENDER_REVISION,
    status: evidence.status,
    rendered_at: renderedAt,
    architecture: { ...request.architecture },
    generation: JSON.parse(JSON.stringify(request.generation)),
    route: JSON.parse(JSON.stringify(route)),
    viewport: { ...viewport },
    runtime: runtimeRecord(runtime),
    browser: { ...browser },
    final_url: evidence.final_url,
    screenshot: evidence.screenshot ? { artifact_reference: screenshotReference, ...evidence.screenshot } : null,
    readiness: evidence.readiness,
    architecture_evidence: evidence.architecture_evidence || null,
    ...(evidence.objective_observations ? { objective_observations: evidence.objective_observations } : {}),
    browser_observations: evidence.browser_observations,
    deterministic_validation: evidence.deterministic_validation,
    provenance: {
      source_kind: 'paid_merchant_generation',
      flow_id: request.flow.flow_id,
      flow_sequence: request.flow.flow_sequence,
      flow_checksum: request.flow.flow_checksum,
      artifact_sha256: request.generation.artifact.sha256,
      manifest_sha256: request.generation.artifact.manifest_sha256,
      request_checksum: digest(request),
      route_binding_revision: request.provenance.route_binding_revision,
      capture_policy_revision: request.provenance.capture_policy_revision,
      runtime_configuration_revision: request.provenance.runtime_configuration_revision
    },
    error: evidence.error
  };
}

function resultReference(result) { return `results/${result.render_id}.json`; }

function merchantRenderCancellationError(message = 'Merchant storefront rendering was cancelled.') {
  return Object.assign(new Error(message), { code: 'merchant_flow_job_cancelled', retryable: false });
}

function createMerchantRenderCancellationMonitor({
  abortRequested = () => false,
  signalSource = process,
  pollIntervalMs = 250
} = {}) {
  const controller = new AbortController();
  let timer = null;
  let closed = false;
  let inFlight = null;
  const abort = (reason = merchantRenderCancellationError()) => {
    if (!controller.signal.aborted) controller.abort(reason);
  };
  const onProcessSignal = () => abort(merchantRenderCancellationError('Merchant storefront rendering was cancelled during process shutdown.'));
  const throwIfAborted = () => {
    if (!controller.signal.aborted) return true;
    const reason = controller.signal.reason;
    throw reason instanceof Error && typeof reason.code === 'string' ? reason : merchantRenderCancellationError();
  };
  async function checkNow() {
    throwIfAborted();
    if (!inFlight) {
      inFlight = Promise.resolve().then(() => abortRequested()).then((requested) => {
        if (requested) abort();
      }).catch(() => {
        abort(Object.assign(new Error('Merchant render cancellation state could not be checked.'), {
          code: 'merchant_flow_cancellation_check_failed',
          retryable: true
        }));
      }).finally(() => { inFlight = null; });
    }
    await inFlight;
    throwIfAborted();
    return true;
  }
  function start() {
    if (closed || timer) return false;
    signalSource?.once?.('SIGTERM', onProcessSignal);
    signalSource?.once?.('SIGINT', onProcessSignal);
    timer = setInterval(() => { void checkNow().catch(() => {}); }, pollIntervalMs);
    timer.unref?.();
    return true;
  }
  function stop() {
    if (closed) return false;
    closed = true;
    if (timer) { clearInterval(timer); timer = null; }
    signalSource?.removeListener?.('SIGTERM', onProcessSignal);
    signalSource?.removeListener?.('SIGINT', onProcessSignal);
    return true;
  }
  return Object.freeze({ signal: controller.signal, start, stop, checkNow, throwIfAborted });
}

function isTerminalRuntimeFailure(error) {
  return error?.retryable === false && (
    String(error?.code || '').startsWith('controlled_beta_storefront_password_binding_')
    || error?.code === 'merchant_flow_job_cancelled'
  );
}

function preferFatalError(current, candidate) {
  if (!candidate) return current;
  if (!current || isTerminalRuntimeFailure(candidate) && !isTerminalRuntimeFailure(current)) return candidate;
  return current;
}

function loadExistingMerchantRender({ root, request }) {
  const destination = destinationFor(root, request);
  const requestFile = path.join(destination, 'render-request.json');
  const manifestFile = path.join(destination, 'render-manifest.json');
  if (!fs.existsSync(requestFile) || !fs.existsSync(manifestFile)) throw new Error('Existing merchant render evidence is incomplete and cannot be reused.');
  const storedRequest = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
  if (digest(storedRequest) !== digest(request)) throw new Error('Existing merchant render evidence belongs to another canonical request.');
  assertMerchantFlowRenderRequest(storedRequest, root);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const manifestBase = { ...manifest }; delete manifestBase.manifest_id;
  if (manifest.request_id !== request.request_id || manifest.request_checksum !== digest(request) || manifest.status !== 'passed'
    || manifest.manifest_id !== `merchant-render-manifest-${digest(manifestBase).slice(0, 20)}`
    || manifest.source_theme_unchanged !== true || manifest.runtime_stopped !== true || manifest.temporary_workspace_cleaned !== true
    || manifest.fixture_fallback_used !== false || manifest.approved_replay_used !== false || manifest.automatic_repair_allowed !== false) {
    throw new Error('Existing merchant render manifest is not reusable passed evidence.');
  }
  const results = manifest.result_references.map((reference) => {
    const file = path.resolve(destination, reference);
    if (!isPathInside(destination, file) || !fs.existsSync(file)) throw new Error('Existing merchant render result is unavailable.');
    const result = JSON.parse(fs.readFileSync(file, 'utf8'));
    assertMerchantFlowRenderResult(result, request, root);
    return result;
  });
  if (results.length !== request.routes.length * request.viewports.length || results.some((result) => result.status !== 'passed')) {
    throw new Error('Existing merchant render evidence does not cover the canonical request matrix.');
  }
  if (JSON.stringify(manifest.result_checksums) !== JSON.stringify(results.map((result) => digest(result)))) {
    throw new Error('Existing merchant render result checksums are stale.');
  }
  return { output_directory: destination, request: storedRequest, results, manifest, reused: true };
}

let merchantRenderLane = Promise.resolve();

async function withMerchantRenderLane(operation) {
  if (typeof operation !== 'function') throw new TypeError('Merchant render lane requires an operation.');
  const predecessor = merchantRenderLane.catch(() => undefined);
  let release;
  merchantRenderLane = new Promise((resolve) => { release = resolve; });
  await predecessor;
  try { return await operation(); }
  finally { release(); }
}

async function captureMerchantFlowStorefrontUnlocked({
  root,
  request,
  port = 9294,
  runtimeFactory = startShopifyDevelopmentRuntime,
  shopifyCliRuntime = null,
  storefrontPasswordBindingFactory = null,
  driverFactory = createPlaywrightCaptureDriver,
  now = () => new Date().toISOString(),
  reuseExisting = true,
  abortRequested = () => false,
  processSignalSource = process
}) {
  assertMerchantFlowRenderRequest(request, root);
  const destination = destinationFor(root, request);
  if (fs.existsSync(destination)) {
    if (!reuseExisting) throw new Error(`Merchant render result ${request.request_id} already exists.`);
    try { return loadExistingMerchantRender({ root, request }); }
    catch (error) {
      if (/Passed merchant render evidence failed validation/.test(error.message)) throw error;
      archiveRetryableMerchantRender({ root, request, destination, now });
    }
  }
  if (await abortRequested()) throw merchantRenderCancellationError('Merchant render was cancelled before execution.');
  fs.mkdirSync(destination, { recursive: true });
  writeJson(path.join(destination, 'render-request.json'), request);
  const sourceBefore = sourceSnapshot(root);
  let prepared = null;
  let runtime = null;
  let driver = null;
  let fatalError = null;
  let runtimeStopped = false;
  let temporaryWorkspaceCleaned = false;
  const results = [];
  const architectureEvidenceByRoute = resolveRouteArchitectureEvidence({ root, request });
  const cancellation = createMerchantRenderCancellationMonitor({ abortRequested, signalSource: processSignalSource });
  cancellation.start();
  try {
    prepared = prepareThemeSource({ root, request });
    await cancellation.checkNow();
    runtime = await runtimeFactory({
      root,
      request,
      themeDirectory: prepared.theme_directory,
      port,
      exactDevelopmentTarget: true,
      shopifyCliRuntime,
      storefrontPasswordBindingFactory,
      abortSignal: cancellation.signal
    });
    cancellation.throwIfAborted();
    if (String(runtime.theme_id) !== request.target.theme_id || runtime.shop_domain !== request.target.shop_domain
      || runtime.theme_role !== request.target.expected_theme_role || runtime.theme_role !== 'development') {
      throw new Error('Shopify development runtime identity differs from the freshly verified controlled target.');
    }
    driver = await driverFactory({ headless: true });
    cancellation.throwIfAborted();
    const browser = { engine: driver.engine, automation: driver.automation, automation_version: driver.automation_version, browser_version: driver.browser_version };
    for (const route of request.routes) {
      for (const viewport of request.viewports) {
        await cancellation.checkNow();
        const reference = merchantScreenshotReference(request, route, viewport);
        const screenshotPath = path.resolve(root, reference);
        if (!isPathInside(destination, screenshotPath)) throw new Error('Merchant screenshot path escaped its canonical render directory.');
        let evidence;
        try {
          evidence = await driver.capture({
            runtime, route, viewport, screenshotPath,
            architectureBound: true,
            artifactBound: prepared.archive_path && request.generation.artifact.sha256 === sha256File(prepared.archive_path),
            architectureEvidence: architectureEvidenceByRoute[route.id],
            abortSignal: cancellation.signal
          });
        } catch (error) {
          cancellation.throwIfAborted();
          if (fs.existsSync(screenshotPath)) fs.rmSync(screenshotPath, { force: true });
          evidence = failedEvidence(error, root);
        }
        cancellation.throwIfAborted();
        let result = buildMerchantRenderResult({ request, route, viewport, runtime, browser, evidence, renderedAt: now() });
        try { assertMerchantFlowRenderResult(result, request, root); }
        catch (error) {
          fatalError ||= error;
          if (fs.existsSync(screenshotPath)) fs.rmSync(screenshotPath, { force: true });
          result = buildMerchantRenderResult({ request, route, viewport, runtime, browser, evidence: failedEvidence(error, root), renderedAt: now() });
          assertMerchantFlowRenderResult(result, request, root);
        }
        if (result.status !== 'passed') fatalError ||= new Error(result.error?.message || `Merchant capture failed for ${route.id}/${viewport.id}.`);
        results.push(result);
        writeJson(path.join(destination, resultReference(result)), result);
      }
    }
  } catch (error) { fatalError = error; }
  finally {
    if (driver) try { await driver.close(); } catch (error) { fatalError = preferFatalError(fatalError, error); }
    if (runtime) try { runtimeStopped = await runtime.stop(); } catch (error) { fatalError = preferFatalError(fatalError, error); }
    if (prepared) try { temporaryWorkspaceCleaned = prepared.cleanup(); } catch (error) { fatalError = preferFatalError(fatalError, error); }
    else temporaryWorkspaceCleaned = true;
    cancellation.stop();
  }
  const sourceThemeUnchanged = sameSnapshot(sourceBefore, sourceSnapshot(root));
  if (!sourceThemeUnchanged) fatalError = preferFatalError(fatalError, new Error('Merchant storefront render changed Calinium source theme files.'));
  if (!runtimeStopped && runtime) fatalError = preferFatalError(fatalError, Object.assign(
    new Error('Merchant Shopify development runtime did not stop cleanly.'),
    { code: 'controlled_beta_storefront_password_binding_shutdown_failed', retryable: false }
  ));
  if (!temporaryWorkspaceCleaned) fatalError = preferFatalError(fatalError, new Error('Merchant storefront render workspace was not cleaned.'));
  const expected = request.routes.length * request.viewports.length;
  const passed = results.filter((result) => result.status === 'passed').length;
  const manifestBase = {
    schema_version: '1.0', manifest_version: 'merchant-flow-storefront-render-manifest-v1',
    request_id: request.request_id, request_checksum: digest(request), render_revision: MERCHANT_RENDER_REVISION,
    status: !fatalError && passed === expected ? 'passed' : 'failed',
    expected_capture_count: expected, passed_capture_count: passed, failed_capture_count: Math.max(0, expected - passed),
    result_references: results.map(resultReference), result_checksums: results.map((result) => digest(result)),
    source_theme_unchanged: sourceThemeUnchanged, runtime_stopped: runtime ? runtimeStopped : true,
    temporary_workspace_cleaned: temporaryWorkspaceCleaned,
    fixture_fallback_used: false, approved_replay_used: false, automatic_repair_allowed: false,
    generated_at: now(), error: fatalError ? { code: 'merchant_storefront_render_failed', message: safeFailureMessage(fatalError, root) } : null
  };
  const manifest = { ...manifestBase, manifest_id: `merchant-render-manifest-${digest(manifestBase).slice(0, 20)}` };
  writeJson(path.join(destination, 'render-manifest.json'), manifest);
  if (manifest.status !== 'passed') {
    throw Object.assign(new Error(manifest.error?.message || 'Merchant storefront render failed.'), {
      code: fatalError?.code || 'shopify_render_failed',
      ...(typeof fatalError?.retryable === 'boolean' ? { retryable: fatalError.retryable } : {}),
      render_manifest: manifest
    });
  }
  return { output_directory: destination, request, results, manifest, reused: false };
}

async function captureMerchantFlowStorefront(options) {
  return withMerchantRenderLane(() => captureMerchantFlowStorefrontUnlocked(options));
}

module.exports = {
  destinationFor,
  retryArchiveRootFor,
  archiveRetryableMerchantRender,
  buildMerchantRenderResult,
  loadExistingMerchantRender,
  withMerchantRenderLane,
  merchantRenderCancellationError,
  createMerchantRenderCancellationMonitor,
  preferFatalError,
  captureMerchantFlowStorefront
};
