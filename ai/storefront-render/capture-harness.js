'use strict';

const fs = require('fs');
const path = require('path');
const { sourceSnapshot, sameSnapshot, isPathInside } = require('../theme-generator/utils');
const {
  RESULT_VERSION,
  digest,
  sha256File,
  assertRenderRequest,
  comparisonKeyFor,
  renderIdFor,
  screenshotReference,
  assertRenderResult,
  resolveRouteArchitectureEvidence,
  PRESENTER_EVIDENCE_REVISION
} = require('./contracts');
const { prepareThemeSource, startShopifyDevelopmentRuntime, safeText } = require('./shopify-development-runtime');
const { createPlaywrightCaptureDriver, READINESS_VERSION } = require('./playwright-capture-driver');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function emptyReadiness() {
  return {
    strategy_version: READINESS_VERSION,
    ready: false,
    document_complete: false,
    landmarks_ready: false,
    fonts_ready: false,
    images_ready: false,
    layout_stable: false,
    reduced_motion: true,
    autoplay_normalized: false,
    lazy_content_exercised: false,
    conditions: []
  };
}

function emptyObservations() {
  return { http_status: null, console_errors: [], page_errors: [], failed_resources: [], http_failures: [] };
}

function runtimeRecord(runtime) {
  return {
    mode: runtime.mode,
    shop_domain: runtime.shop_domain,
    theme_id: String(runtime.theme_id),
    theme_role: runtime.theme_role,
    remote_preview_url: runtime.remote_preview_url || null,
    local_proxy_origin: runtime.local_proxy_origin
  };
}

function safeFailureMessage(error, root = '') {
  const message = safeText(error?.message || error || 'The storefront capture failed.', 1000);
  return root ? message.replaceAll(path.resolve(root), '<repository>') : message;
}

function failedCaptureEvidence(error, root = '') {
  return {
    status: 'failed',
    final_url: null,
    screenshot: null,
    readiness: emptyReadiness(),
    architecture_evidence: null,
    objective_observations: null,
    browser_observations: emptyObservations(),
    deterministic_validation: { valid: false, checks: [{ id: 'capture_completed', passed: false }] },
    error: { code: 'storefront_capture_failed', message: safeFailureMessage(error, root) }
  };
}

function buildRenderResult({ request, route, viewport, runtime, browser, evidence, renderedAt, screenshotArtifactReference }) {
  const result = {
    schema_version: '1.0',
    contract_version: RESULT_VERSION,
    render_id: renderIdFor(request, route, viewport),
    request_id: request.request_id,
    render_revision: request.render_revision,
    status: evidence.status,
    rendered_at: renderedAt,
    architecture: { ...request.architecture },
    generation: JSON.parse(JSON.stringify(request.generation)),
    route: JSON.parse(JSON.stringify(route)),
    viewport: { ...viewport },
    runtime: runtimeRecord(runtime),
    browser: { ...browser },
    final_url: evidence.final_url,
    screenshot: evidence.screenshot ? { artifact_reference: screenshotArtifactReference, ...evidence.screenshot } : null,
    readiness: evidence.readiness,
    architecture_evidence: evidence.architecture_evidence || null,
    ...(evidence.objective_observations ? { objective_observations: evidence.objective_observations } : {}),
    browser_observations: evidence.browser_observations,
    deterministic_validation: evidence.deterministic_validation,
    provenance: {
      capture_purpose: request.capture_purpose,
      entity: route.entity ? { ...route.entity } : null,
      artifact_sha256: request.generation.artifact.sha256,
      request_checksum: digest(request),
      comparison_fixture_revision: request.provenance.comparison_fixture_revision,
      capture_policy_revision: request.provenance.capture_policy_revision
    },
    error: evidence.error
  };
  return result;
}

function resultReference(result) { return `results/${result.render_id}.json`; }

function assertCaptureOutput(root, request, outputDirectory) {
  const rootOutput = path.resolve(root, 'output', 'storefront-renders');
  const resolved = path.resolve(outputDirectory || path.join(rootOutput, request.request_id));
  if (!isPathInside(rootOutput, resolved)) throw new Error('Storefront render results must remain inside output/storefront-renders/.');
  if (path.basename(resolved) !== request.request_id) throw new Error('Storefront render output directory must be named for the Render Request ID.');
  return resolved;
}

async function captureStorefrontRender({
  root,
  request,
  outputDirectory = null,
  port = 9294,
  executeDevelopmentRender = false,
  replace = false,
  headless = true,
  runtimeFactory = startShopifyDevelopmentRuntime,
  shopifyCliRuntime = null,
  driverFactory = createPlaywrightCaptureDriver,
  now = () => new Date().toISOString()
}) {
  assertRenderRequest(request, root);
  if (!executeDevelopmentRender) throw new Error('Shopify development rendering is disabled until --execute-development-render is supplied explicitly.');
  const destination = assertCaptureOutput(root, request, outputDirectory);
  if (fs.existsSync(destination)) {
    if (!replace) throw new Error(`Storefront render result ${request.request_id} already exists.`);
    fs.rmSync(destination, { recursive: true, force: true });
  }
  fs.mkdirSync(destination, { recursive: true });
  writeJson(path.join(destination, 'render-request.json'), request);
  const themeBefore = sourceSnapshot(root);
  let prepared = null;
  let runtime = null;
  let driver = null;
  const results = [];
  const architectureEvidenceByRoute = resolveRouteArchitectureEvidence({ root, request });
  let fatalError = null;
  let temporaryWorkspaceCleaned = false;
  let runtimeStopped = false;
  try {
    prepared = prepareThemeSource({ root, request });
    runtime = await runtimeFactory({ root, request, themeDirectory: prepared.theme_directory, port, shopifyCliRuntime });
    driver = await driverFactory({ headless });
    const browserIdentity = {
      engine: driver.engine,
      automation: driver.automation,
      automation_version: driver.automation_version,
      browser_version: driver.browser_version
    };
    for (const route of request.routes) {
      for (const viewport of request.viewports) {
        const renderId = renderIdFor(request, route, viewport);
        const screenshotArtifactReference = screenshotReference(request, route, viewport);
        const screenshotPath = path.join(destination, screenshotArtifactReference);
        let evidence;
        try {
          evidence = await driver.capture({
            runtime,
            route,
            viewport,
            screenshotPath,
            architectureBound: Boolean(request.architecture.selection_revision_id),
            artifactBound: prepared.archive_path && request.generation.artifact.sha256 === sha256File(prepared.archive_path),
            architectureEvidence: architectureEvidenceByRoute[route.id]
          });
        } catch (error) {
          if (fs.existsSync(screenshotPath)) fs.rmSync(screenshotPath, { force: true });
          evidence = failedCaptureEvidence(error, root);
        }
        const result = buildRenderResult({ request, route, viewport, runtime, browser: browserIdentity, evidence, renderedAt: now(), screenshotArtifactReference });
        try { assertRenderResult(result, request, root); }
        catch (error) {
          if (!fatalError) fatalError = error;
          if (fs.existsSync(screenshotPath)) fs.rmSync(screenshotPath, { force: true });
          const failed = buildRenderResult({ request, route, viewport, runtime, browser: browserIdentity, evidence: failedCaptureEvidence(error, root), renderedAt: now(), screenshotArtifactReference });
          assertRenderResult(failed, request, root);
          results.push(failed);
          writeJson(path.join(destination, resultReference(failed)), failed);
          continue;
        }
        results.push(result);
        writeJson(path.join(destination, resultReference(result)), result);
      }
    }
  } catch (error) { fatalError = error; }
  finally {
    if (driver) {
      try { await driver.close(); } catch (error) { fatalError ||= error; }
    }
    if (runtime) {
      try { runtimeStopped = await runtime.stop(); } catch (error) { fatalError ||= error; }
    }
    if (prepared) {
      try { temporaryWorkspaceCleaned = prepared.cleanup(); } catch (error) { fatalError ||= error; }
    } else temporaryWorkspaceCleaned = true;
  }
  const sourceThemeUnchanged = sameSnapshot(themeBefore, sourceSnapshot(root));
  if (!sourceThemeUnchanged) fatalError ||= new Error('Storefront render changed the source Calinium theme.');
  if (!temporaryWorkspaceCleaned) fatalError ||= new Error('Storefront render temporary workspace was not cleaned.');
  if (runtime && !runtimeStopped) fatalError ||= new Error('Shopify development runtime did not stop cleanly.');
  const passed = results.filter((result) => result.status === 'passed').length;
  const failed = results.filter((result) => result.status === 'failed').length;
  const expected = request.routes.length * request.viewports.length;
  const complete = !fatalError && results.length === expected && failed === 0 && sourceThemeUnchanged && temporaryWorkspaceCleaned && runtimeStopped;
  const manifest = {
    schema_version: '1.0',
    manifest_version: 'storefront-render-manifest-v1',
    request_id: request.request_id,
    render_revision: request.render_revision,
    status: complete ? 'passed' : 'failed',
    architecture: { ...request.architecture },
    generation: JSON.parse(JSON.stringify(request.generation)),
    target: { ...request.target },
    capture_purpose: request.capture_purpose,
    expected_capture_count: expected,
    passed_capture_count: passed,
    failed_capture_count: failed + Math.max(0, expected - results.length),
    result_references: results.map(resultReference),
    comparison_contract_version: 'storefront-architecture-comparison-v1',
    comparison_fixture_revision: request.provenance.comparison_fixture_revision,
    comparison_key: comparisonKeyFor(request),
    architecture_evidence_revision: PRESENTER_EVIDENCE_REVISION,
    presenter_evidence_valid: results.length === expected && results.every((result) => result.architecture_evidence?.valid === true),
    source_theme_unchanged: sourceThemeUnchanged,
    runtime_stopped: runtimeStopped,
    temporary_workspace_cleaned: temporaryWorkspaceCleaned,
    generated_at: now(),
    error: fatalError ? { code: 'storefront_render_run_failed', message: safeFailureMessage(fatalError, root) } : null
  };
  writeJson(path.join(destination, 'render-manifest.json'), manifest);
  return { output_directory: destination, request, results, manifest };
}

module.exports = {
  writeJson,
  emptyReadiness,
  emptyObservations,
  safeFailureMessage,
  runtimeRecord,
  failedCaptureEvidence,
  buildRenderResult,
  resultReference,
  assertCaptureOutput,
  captureStorefrontRender
};
