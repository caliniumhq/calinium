#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { EventEmitter } = require('events');
const { selectArchitecture, architectureProvenance } = require('../ai/architecture');
const {
  createRenderRequest,
  assertRenderRequest,
  assertRenderResult,
  resolveRoutes,
  resolveViewports,
  renderIdFor,
  screenshotReference,
  sha256File,
  digest,
  comparisonFixtureRevision,
  comparisonKeyFor,
  loadRouteRegistry,
  loadViewportRegistry,
  loadTargetRegistry,
  loadPresenterEvidenceRegistry,
  resolveRouteArchitectureEvidence,
  redactSensitiveText
} = require('../ai/storefront-render/contracts');
const {
  buildRenderResult,
  captureStorefrontRender
} = require('../ai/storefront-render/capture-harness');
const {
  assertSafeThemeDevArgs,
  validateArchiveEntries,
  safeText,
  stopChildProcess,
  startShopifyDevelopmentRuntime
} = require('../ai/storefront-render/shopify-development-runtime');
const {
  READINESS_VERSION,
  safeUrl,
  safeMessage,
  isCriticalResource,
  isFatalPageError,
  pngDimensions,
  waitForLayoutStability
} = require('../ai/storefront-render/playwright-capture-driver');
const { materializeControlledArtifact } = require('../ai/storefront-render/materialize-controlled-artifact');
const { loadArchitectureRegistry } = require('../ai/architecture/architecture-registry');
const {
  PUBLIC_SYNTHETIC_COMPARISON,
  assertSamePublicSyntheticComparisonContract,
  assertStructuralDifferentiation
} = require('../ai/storefront-render/architecture-comparison');

const root = path.resolve(__dirname, '..');
const TEST_WORKSPACE = path.join(root, 'output', `storefront-render-test-${process.pid}`);
const TEST_ARCHIVE = path.join(TEST_WORKSPACE, 'current-calinium-theme.zip');
const TEST_MANIFEST = path.join(TEST_WORKSPACE, 'current-calinium-theme-manifest.json');
const EDITORIAL_TEST_ARCHIVE = path.join(TEST_WORKSPACE, 'editorial-discovery-theme.zip');
const EDITORIAL_TEST_MANIFEST = path.join(TEST_WORKSPACE, 'editorial-discovery-theme-manifest.json');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return chunk;
}

function blankPng(width, height, variant = 0) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const rowBytes = (width * 4) + 1;
  const pixels = Buffer.alloc(rowBytes * height);
  if (variant) pixels[Math.min(pixels.length - 1, 1)] = variant;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(pixels, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8')); }

function createLocalThemeArchive() {
  fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
  const themeRoot = path.join(root, 'apps', 'theme');
  const roots = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates']
    .filter((name) => fs.existsSync(path.join(themeRoot, name)));
  execFileSync('zip', ['-q', '-X', '-r', TEST_ARCHIVE, ...roots], {
    cwd: themeRoot,
    stdio: ['ignore', 'ignore', 'pipe']
  });
  assert.ok(fs.statSync(TEST_ARCHIVE).size > 0, 'The isolated test theme archive was not created.');
  const fixture = createFixture();
  const selection = selectArchitecture({ profileId: fixture.architecture_profile_id, root });
  const fixtureRevision = comparisonFixtureRevision({
    fixture,
    routeRegistry: loadRouteRegistry(root),
    viewportRegistry: loadViewportRegistry(root),
    targetRegistry: loadTargetRegistry(root)
  });
  fs.writeFileSync(TEST_MANIFEST, `${JSON.stringify({
    version: 1,
    export_type: 'calinium_storefront_render_test_artifact',
    status: 'passed',
    generation_id: 'generation-run-preset-demo-essential',
    preset_id: fixture.generation_fixture.preset_id,
    merchant_fixture: fixture.generation_fixture.fixture_id,
    strategy_revision: 'strategy-test-current-calinium',
    generator_version: '1.0.0',
    architecture_selection: architectureProvenance(selection, root),
    resource_binding_revision: null,
    fixture_provenance: {
      fixture_id: fixture.fixture_id,
      fixture_version: fixture.fixture_version,
      comparison_fixture_revision: fixtureRevision
    },
    zip: { path: fixture.generation_fixture.artifact_reference, sha256: sha256File(TEST_ARCHIVE) },
    shopify_operations: { write_operations: false, upload: false, publish: false }
  }, null, 2)}\n`);

  fs.copyFileSync(TEST_ARCHIVE, EDITORIAL_TEST_ARCHIVE);
  const editorialFixture = createEditorialFixture();
  const editorialSelection = selectArchitecture({ profileId: editorialFixture.architecture_profile_id, root });
  assert.equal(comparisonFixtureRevision({
    fixture: editorialFixture,
    routeRegistry: loadRouteRegistry(root),
    viewportRegistry: loadViewportRegistry(root),
    targetRegistry: loadTargetRegistry(root)
  }), fixtureRevision, 'Editorial fixture must preserve the exact approved comparison-fixture semantics.');
  fs.writeFileSync(EDITORIAL_TEST_MANIFEST, `${JSON.stringify({
    version: 1,
    export_type: 'calinium_storefront_render_test_artifact',
    status: 'passed',
    generation_id: 'generation-run-architecture-editorial-discovery-essential',
    preset_id: editorialFixture.generation_fixture.preset_id,
    merchant_fixture: editorialFixture.generation_fixture.fixture_id,
    strategy_revision: 'strategy-test-current-calinium',
    generator_version: '1.0.0',
    architecture_selection: architectureProvenance(editorialSelection, root),
    resource_binding_revision: null,
    fixture_provenance: {
      fixture_id: editorialFixture.fixture_id,
      fixture_version: editorialFixture.fixture_version,
      comparison_fixture_revision: fixtureRevision
    },
    zip: { path: editorialFixture.generation_fixture.artifact_reference, sha256: sha256File(EDITORIAL_TEST_ARCHIVE) },
    shopify_operations: { write_operations: false, upload: false, publish: false }
  }, null, 2)}\n`);
}

function testControlledArtifactMaterialization() {
  const sourceDirectory = path.join(TEST_WORKSPACE, 'controlled-source-theme');
  const sourceArchive = path.join(TEST_WORKSPACE, 'controlled-source.zip');
  const sourceManifest = path.join(TEST_WORKSPACE, 'controlled-source-manifest.json');
  const finalArchive = path.join(TEST_WORKSPACE, 'controlled-final.zip');
  const finalManifest = path.join(TEST_WORKSPACE, 'controlled-final-manifest.json');
  fs.cpSync(path.join(root, 'apps', 'theme'), sourceDirectory, { recursive: true });
  const indexPath = path.join(sourceDirectory, 'templates', 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const first = index.sections[index.order[0]];
  first.settings ||= {};
  first.settings.image = 'shopify://fixture-resources/test-image';
  first.settings.collection = 'shopify://fixture-resources/test-collection';
  first.settings.video = 'shopify://fixture-resources/test-video';
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  const roots = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates']
    .filter((name) => fs.existsSync(path.join(sourceDirectory, name)));
  execFileSync('zip', ['-q', '-X', '-r', sourceArchive, ...roots], { cwd: sourceDirectory, stdio: ['ignore', 'ignore', 'pipe'] });
  const selection = selectArchitecture({ profileId: 'profile.current_calinium.v1', root });
  fs.writeFileSync(sourceManifest, `${JSON.stringify({
    preset_id: 'essential', preset_version: '1.0', merchant_fixture: 'test', strategy_revision: 'test', generator_version: '1.0.0',
    architecture_selection: architectureProvenance(selection, root), zip: { sha256: sha256File(sourceArchive) }
  }, null, 2)}\n`);
  const fixture = createFixture();
  fixture.generation_fixture.artifact_reference = path.relative(root, finalArchive);
  fixture.generation_fixture.artifact_manifest_reference = path.relative(root, finalManifest);
  fixture.generation_fixture.source_artifact_reference = path.relative(root, sourceArchive);
  fixture.generation_fixture.source_artifact_manifest_reference = path.relative(root, sourceManifest);
  const firstRun = materializeControlledArtifact({ root, fixture, now: () => '2026-08-13T00:00:00.000Z' });
  assert.equal(firstRun.manifest.materialization.bound_count, 2);
  assert.equal(firstRun.manifest.materialization.omitted_count, 1);
  assert.equal(firstRun.manifest.shopify_operations.write_operations, false);
  const finalIndex = execFileSync('unzip', ['-p', finalArchive, 'templates/index.json'], { encoding: 'utf8' });
  assert.doesNotMatch(finalIndex, /shopify:\/\/fixture-/);
  assert.match(finalIndex, /shopify:\/\/shop_images\/Main_0a40b01b-5021-48c1-80d1-aa8ab4876d3d\.jpg/);
  assert.match(finalIndex, /"collection": "hydrogen"/);
  assert.doesNotMatch(finalIndex, /"video"/);
  const firstSha = sha256File(finalArchive);
  const secondRun = materializeControlledArtifact({ root, fixture, now: () => '2026-08-14T00:00:00.000Z' });
  assert.equal(sha256File(finalArchive), firstSha, 'Controlled runtime materialization must produce deterministic archive bytes.');
  assert.equal(secondRun.manifest.resource_binding_revision, firstRun.manifest.resource_binding_revision);
  assert.match(firstRun.manifest.fixture_provenance.comparison_fixture_revision, /^comparison-fixture-[a-f0-9]{20}$/);
}

function createFixture() {
  const fixture = readJson('fixtures/storefront-render-current-calinium.json');
  fixture.generation_fixture.artifact_reference = path.relative(root, TEST_ARCHIVE);
  fixture.generation_fixture.artifact_manifest_reference = path.relative(root, TEST_MANIFEST);
  fixture.generation_fixture.source_artifact_reference = path.relative(root, TEST_ARCHIVE);
  fixture.generation_fixture.source_artifact_manifest_reference = path.relative(root, TEST_MANIFEST);
  fixture.requested_routes = ['cart', 'product', 'homepage', 'collection'];
  fixture.requested_viewports = ['mobile-v1', 'desktop-v1'];
  return fixture;
}

function createEditorialFixture() {
  const fixture = readJson('fixtures/storefront-render-editorial-discovery.json');
  fixture.generation_fixture.artifact_reference = path.relative(root, EDITORIAL_TEST_ARCHIVE);
  fixture.generation_fixture.artifact_manifest_reference = path.relative(root, EDITORIAL_TEST_MANIFEST);
  fixture.generation_fixture.source_artifact_reference = path.relative(root, EDITORIAL_TEST_ARCHIVE);
  fixture.generation_fixture.source_artifact_manifest_reference = path.relative(root, EDITORIAL_TEST_MANIFEST);
  fixture.requested_routes = ['cart', 'product', 'homepage', 'collection'];
  fixture.requested_viewports = ['mobile-v1', 'desktop-v1'];
  return fixture;
}

function createRequest() {
  const fixture = createFixture();
  const architectureSelection = selectArchitecture({ profileId: fixture.architecture_profile_id, root });
  return createRenderRequest({ root, fixture, architectureSelection });
}

function refreshRequestId(request) {
  const base = clone(request);
  delete base.request_id;
  request.request_id = `render-request-${digest(base).slice(0, 20)}`;
  return request;
}

function passedReadiness() {
  return {
    strategy_version: READINESS_VERSION,
    ready: true,
    document_complete: true,
    landmarks_ready: true,
    fonts_ready: true,
    images_ready: true,
    layout_stable: true,
    reduced_motion: true,
    autoplay_normalized: true,
    lazy_content_exercised: true,
    conditions: [
      { id: 'document_complete', passed: true },
      { id: 'expected_landmarks', passed: true },
      { id: 'fonts_ready', passed: true },
      { id: 'images_ready', passed: true },
      { id: 'layout_stable', passed: true }
    ]
  };
}

function createPassedEvidence({ runtime, route, viewport, screenshotPath, architectureBound, artifactBound, architectureEvidence }) {
  assert.equal(architectureBound, true, 'Capture must bind a frozen architecture revision.');
  assert.equal(artifactBound, true, 'Capture must bind the trusted generated artifact digest.');
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  fs.writeFileSync(screenshotPath, blankPng(viewport.width, viewport.height));
  const dimensions = pngDimensions(screenshotPath);
  assert.deepEqual(dimensions, { width: viewport.width, height: viewport.height });
  const finalUrl = new URL(route.path, runtime.local_proxy_origin).toString();
  return {
    status: 'passed',
    final_url: finalUrl,
    screenshot: {
      sha256: sha256File(screenshotPath),
      bytes: fs.statSync(screenshotPath).size,
      width: dimensions.width,
      height: dimensions.height,
      full_page: true
    },
    readiness: passedReadiness(),
    architecture_evidence: {
      ...clone(architectureEvidence),
      assertions: architectureEvidence.assertions.map((assertion) => ({ ...assertion, matched_count: 1, passed: true })),
      valid: true
    },
    browser_observations: {
      http_status: 200,
      console_errors: [],
      page_errors: [],
      failed_resources: [],
      http_failures: []
    },
    deterministic_validation: {
      valid: true,
      checks: [
        { id: 'page_loaded', passed: true },
        { id: 'requested_route_resolved', passed: true },
        { id: 'expected_landmarks_exist', passed: true },
        { id: 'no_fatal_page_error', passed: true },
        { id: 'no_critical_asset_failure', passed: true },
        { id: 'viewport_dimensions_correct', passed: true, actual: { width: viewport.width, height: viewport.height } },
        { id: 'architecture_provenance_present', passed: true },
        { id: 'registered_presenters_rendered', passed: true },
        { id: 'generated_artifact_binding_verified', passed: true },
        { id: 'deterministic_readiness_complete', passed: true },
        { id: 'screenshot_generated', passed: true },
        { id: 'screenshot_dimensions_correct', passed: true, actual: { width: viewport.width, height: viewport.height } }
      ]
    },
    error: null
  };
}

function testRequestContract() {
  const request = createRequest();
  assert.equal(assertRenderRequest(request, root), request);
  assert.deepEqual(request.routes.map((route) => route.id), ['homepage', 'collection', 'product', 'cart'], 'Route registry order must be canonical, not caller order.');
  assert.deepEqual(request.viewports.map((viewport) => viewport.id), ['desktop-v1', 'mobile-v1'], 'Viewport registry order must be canonical, not caller order.');
  assert.deepEqual(request.viewports.map(({ id, width, height }) => ({ id, width, height })), [
    { id: 'desktop-v1', width: 1440, height: 900 },
    { id: 'mobile-v1', width: 390, height: 844 }
  ]);
  assert.equal(request.architecture.profile_id, 'profile.current_calinium.v1');
  assert.equal(request.target.runtime_mode, 'shopify_development_proxy');
  assert.equal(request.target.expected_theme_role, 'development');
  assert.equal(request.target.fixture_version, '1.0.0');
  assert.match(request.provenance.comparison_fixture_revision, /^comparison-fixture-[a-f0-9]{20}$/);
  assert.equal(request.safety.live_theme_allowed, false);
  assert.equal(request.safety.publish_allowed, false);
  assert.equal(request.safety.cart_mutation_allowed, false);

  const collection = request.routes.find((route) => route.id === 'collection');
  const product = request.routes.find((route) => route.id === 'product');
  assert.equal(collection.path, '/collections/hydrogen');
  assert.equal(collection.entity.remote_gid, 'gid://shopify/Collection/200000000003');
  assert.equal(product.path, '/products/the-collection-snowboard-hydrogen');
  assert.equal(product.entity.remote_gid, 'gid://shopify/Product/20000000000001');
  assert.deepEqual(createRequest(), request, 'Identical frozen inputs must create an identical Render Request.');
  const canonicalOrderFixture = createFixture();
  canonicalOrderFixture.requested_routes.reverse();
  canonicalOrderFixture.requested_viewports.reverse();
  assert.equal(
    comparisonFixtureRevision({ fixture: canonicalOrderFixture, routeRegistry: loadRouteRegistry(root), viewportRegistry: loadViewportRegistry(root), targetRegistry: loadTargetRegistry(root) }),
    request.provenance.comparison_fixture_revision,
    'Comparison-fixture identity must ignore irrelevant requested-route and viewport ordering.'
  );

  assert.throws(() => resolveRoutes({ root, routeIds: ['homepage', 'not-a-route'], entities: {} }), /Unknown storefront render route/);
  assert.throws(() => resolveRoutes({ root, routeIds: ['homepage', 'homepage'], entities: {} }), /cannot be duplicated/);
  assert.throws(() => resolveRoutes({ root, routeIds: ['collection'], entities: {} }), /normalized lowercase handle/);
  assert.throws(() => resolveViewports({ root, viewportIds: ['watch-v1'] }), /Unknown storefront render viewport/);
  const editorialSelection = selectArchitecture({ profileId: 'profile.editorial_discovery.v1', root });
  assert.equal(editorialSelection.profile_id, 'profile.editorial_discovery.v1');
  assert.equal(editorialSelection.selection_source, 'explicit_profile');

  const forgedArchitecture = clone(request);
  forgedArchitecture.architecture.profile_id = 'profile.editorial_discovery.v1';
  assert.throws(() => assertRenderRequest(forgedArchitecture, root), /Request ID does not match|architecture provenance does not match/);
  const forgedPath = clone(request);
  forgedPath.routes.find((route) => route.id === 'product').path = '/products/a-different-product';
  assert.throws(() => assertRenderRequest(forgedPath, root), /not canonical registry resolutions/);

  const forgedSelection = refreshRequestId(clone(request));
  forgedSelection.architecture.selection_revision_id = 'architecture-selection-00000000000000000000';
  refreshRequestId(forgedSelection);
  assert.throws(() => assertRenderRequest(forgedSelection, root), /architecture provenance does not match/);

  const substitutedArchive = path.join(TEST_WORKSPACE, 'substituted-theme.zip');
  fs.writeFileSync(substitutedArchive, Buffer.concat([fs.readFileSync(TEST_ARCHIVE), Buffer.from('substitution')]));
  const substituted = clone(request);
  substituted.generation.artifact.source_reference = path.relative(root, substitutedArchive);
  substituted.generation.artifact.sha256 = sha256File(substitutedArchive);
  substituted.generation.artifact.artifact_id = `theme-artifact-${digest({ source_reference: substituted.generation.artifact.source_reference, sha256: substituted.generation.artifact.sha256 }).slice(0, 20)}`;
  refreshRequestId(substituted);
  assert.throws(() => assertRenderRequest(substituted, root), /checksum does not match its generation manifest/);

  const architectureOnly = clone(request);
  architectureOnly.architecture = { profile_id: 'profile.future.v1', profile_version: '1.0.0', selection_revision_id: 'architecture-selection-11111111111111111111' };
  assert.equal(comparisonKeyFor(architectureOnly), comparisonKeyFor(request), 'Architecture alone must not change the comparison key.');
  const changedFixture = clone(request);
  changedFixture.provenance.comparison_fixture_revision = 'comparison-fixture-22222222222222222222';
  assert.notEqual(comparisonKeyFor(changedFixture), comparisonKeyFor(request), 'Changed fixture/resource provenance must change the comparison key.');
  return request;
}

function testResultContract(request) {
  const runtime = {
    mode: 'shopify_development_proxy',
    shop_domain: request.target.shop_domain,
    theme_id: '1234567890',
    theme_role: 'development',
    remote_preview_url: null,
    local_proxy_origin: 'http://127.0.0.1:9294'
  };
  const route = request.routes[0];
  const viewport = request.viewports[0];
  const screenshotPath = path.join(TEST_WORKSPACE, 'contract-result.png');
  const architectureEvidence = resolveRouteArchitectureEvidence({ root, request })[route.id];
  const evidence = createPassedEvidence({ runtime, route, viewport, screenshotPath, architectureBound: true, artifactBound: true, architectureEvidence });
  const result = buildRenderResult({
    request,
    route,
    viewport,
    runtime,
    browser: { engine: 'chromium', automation: 'playwright', automation_version: '1.55.1', browser_version: '140.0.0.0-test-double' },
    evidence,
    renderedAt: '2026-08-13T00:00:00.000Z',
    screenshotArtifactReference: screenshotReference(request, route, viewport)
  });
  assert.equal(result.render_id, renderIdFor(request, route, viewport));
  assert.equal(assertRenderResult(result, request, root), result);
  assert.match(result.screenshot.sha256, /^[a-f0-9]{64}$/);
  assert.ok(result.screenshot.bytes > 0);
  assert.equal(result.screenshot.width, viewport.width);
  assert.equal(result.screenshot.height, viewport.height);
  assert.equal(result.screenshot.full_page, true);
  assert.equal(result.readiness.ready, true);
  assert.equal(result.architecture_evidence.valid, true);
  assert.equal(result.architecture_evidence.template_identity, 'templates/index.json');
  assert.ok(result.architecture_evidence.rendered_section_identities.includes('featured-collection'));
  assert.equal(result.deterministic_validation.valid, true);
  assert.equal(result.provenance.artifact_sha256, request.generation.artifact.sha256);
  assert.equal(result.provenance.comparison_fixture_revision, request.provenance.comparison_fixture_revision);

  const missingScreenshot = clone(result);
  missingScreenshot.screenshot = null;
  assert.throws(() => assertRenderResult(missingScreenshot, request, root), /missing trusted screenshot\/readiness evidence/);
  const wrongRequest = clone(result);
  wrongRequest.request_id = 'render-request-00000000000000000000';
  assert.throws(() => assertRenderResult(wrongRequest, request, root), /different Render Request/);
  const unsupportedArchitectureMetadata = clone(result);
  unsupportedArchitectureMetadata.architecture.internal_score = 1;
  assert.throws(() => assertRenderResult(unsupportedArchitectureMetadata, request, root), /unsupported field internal_score/);
  const forgedResultProvenance = clone(result);
  forgedResultProvenance.provenance.artifact_sha256 = '0'.repeat(64);
  forgedResultProvenance.provenance.request_checksum = '1'.repeat(64);
  forgedResultProvenance.provenance.comparison_fixture_revision = 'comparison-fixture-22222222222222222222';
  assert.throws(() => assertRenderResult(forgedResultProvenance, request, root), /artifact checksum provenance differs|request checksum provenance is invalid|comparison-fixture provenance differs/);
}

async function testConditionalReadiness() {
  const values = [
    { scroll_height: 100, scroll_width: 100, main_width: 50, main_height: 40 },
    { scroll_height: 120, scroll_width: 100, main_width: 50, main_height: 60 },
    { scroll_height: 120, scroll_width: 100, main_width: 50, main_height: 60 },
    { scroll_height: 120, scroll_width: 100, main_width: 50, main_height: 60 }
  ];
  let evaluations = 0;
  let waits = 0;
  const page = {
    async evaluate() { return values[Math.min(evaluations++, values.length - 1)]; },
    async waitForTimeout(milliseconds) { assert.equal(milliseconds, 100); waits += 1; }
  };
  const stable = await waitForLayoutStability(page, 10);
  assert.equal(stable.stable, true);
  assert.equal(evaluations, 4, 'Readiness must sample real layout state until it stabilizes.');
  assert.equal(waits, 3, 'Polling delay may separate measurements but cannot replace the measured condition.');

  let changing = 0;
  const unstable = await waitForLayoutStability({
    async evaluate() { changing += 1; return { scroll_height: changing, scroll_width: 1, main_width: 1, main_height: changing }; },
    async waitForTimeout() {}
  }, 4);
  assert.equal(unstable.stable, false, 'Elapsed delay without stable layout measurements must not mark a page ready.');
}

function testRuntimeSafety(request) {
  const safeArgs = ['theme', 'dev', '--path', '/generated/theme', '--store', request.target.shop_domain, '--live-reload', 'off'];
  assert.deepEqual(assertSafeThemeDevArgs(safeArgs), safeArgs);
  for (const flag of ['--allow-live', '--live', '--publish', '--store-password', '--theme-editor-sync']) {
    assert.throws(() => assertSafeThemeDevArgs([...safeArgs, flag]), /forbids Shopify CLI flag/);
  }
  assert.throws(() => assertSafeThemeDevArgs(['theme', 'dev', '--path', '/generated/theme']), /live reload to be disabled/);
  assert.throws(() => assertSafeThemeDevArgs([...safeArgs, '--theme', '123']), /cannot target an arbitrary existing theme/);
  assert.deepEqual(validateArchiveEntries([
    'assets/theme.css', 'config/settings_schema.json', 'layout/theme.liquid', 'locales/en.default.json',
    'sections/header.liquid', 'snippets/product-card.liquid', 'templates/index.json'
  ]), []);
  assert.ok(validateArchiveEntries(['../outside.txt']).length > 0);
  assert.ok(validateArchiveEntries(['docs/internal.md']).length > 0);
  assert.equal(isCriticalResource('http://cdn.shopify.com/shopifycloud/storefront/assets/storefront/origin_trials-abc.js', 'script'), false);
  assert.equal(isCriticalResource('http://127.0.0.1:9294/assets/theme.js', 'script'), true);
  assert.equal(isFatalPageError("Service worker is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag."), false);
  assert.equal(isFatalPageError('Theme controller crashed'), true);
  const secret = 'do-not-persist-this-token';
  assert.doesNotMatch(redactSensitiveText(`https://example.test/a?token=${secret}&x=1 Authorization: Bearer ${secret}`), new RegExp(secret));
  assert.doesNotMatch(safeText(`request failed api_key=${secret}`), new RegExp(secret));
  assert.doesNotMatch(safeMessage(`console failed access_token=${secret}`), new RegExp(secret));
  assert.doesNotMatch(safeUrl(`not a URL?client_secret=${secret}`), new RegExp(secret));
  assert.doesNotMatch(safeMessage(`Authorization: Basic ${secret}`), new RegExp(secret));
  assert.doesNotMatch(safeUrl(`https://example.test/a?authorization=Bearer%20${secret}&session_id=${secret}`), new RegExp(secret));
}

async function testRuntimeStartupCleanup(request) {
  function stubbornChild() {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.exitCode = null;
    child.signalCode = null;
    child.pid = 12345;
    child.signals = [];
    child.kill = (signal) => {
      child.signals.push(signal);
      if (signal === 'SIGKILL') {
        child.signalCode = signal;
        queueMicrotask(() => child.emit('exit', null, signal));
      }
      return true;
    };
    return child;
  }
  const direct = stubbornChild();
  assert.equal(await stopChildProcess(direct, { interrupt_ms: 0, terminate_ms: 0, kill_ms: 1 }), true);
  assert.deepEqual(direct.signals, ['SIGINT', 'SIGTERM', 'SIGKILL']);

  const startup = stubbornChild();
  await assert.rejects(() => startShopifyDevelopmentRuntime({
    root,
    request,
    themeDirectory: path.join(root, 'apps', 'theme'),
    startupTimeoutMs: 0,
    shopifyCliRuntime: {
      assertRenderReady: () => '4.6.0',
      spawn: () => startup,
      assertStable: () => '4.6.0'
    },
    shutdownTimings: { interrupt_ms: 0, terminate_ms: 0, kill_ms: 1 }
  }), /did not become ready/);
  assert.deepEqual(startup.signals, ['SIGINT', 'SIGTERM', 'SIGKILL'], 'Early startup failure must fully stop the Shopify CLI child.');
}

async function testEightCaptureBaseline(request) {
  let runtimeStopped = false;
  let driverClosed = false;
  let captured = 0;
  let preparedThemeDirectory = null;
  const result = await captureStorefrontRender({
    root,
    request,
    executeDevelopmentRender: true,
    headless: true,
    now: () => '2026-08-13T00:00:00.000Z',
    runtimeFactory: async ({ request: runtimeRequest, themeDirectory }) => {
      preparedThemeDirectory = themeDirectory;
      assert.equal(runtimeRequest.request_id, request.request_id);
      assert.ok(fs.existsSync(path.join(themeDirectory, 'layout', 'theme.liquid')));
      assert.ok(fs.existsSync(path.join(themeDirectory, 'templates', 'index.json')));
      return {
        mode: runtimeRequest.target.runtime_mode,
        shop_domain: runtimeRequest.target.shop_domain,
        theme_id: '9876543210',
        theme_role: 'development',
        remote_preview_url: `https://${runtimeRequest.target.shop_domain}/?preview_theme_id=9876543210`,
        local_proxy_origin: 'http://127.0.0.1:9294',
        async stop() { runtimeStopped = true; return true; }
      };
    },
    driverFactory: async () => ({
      engine: 'chromium',
      automation: 'playwright',
      automation_version: '1.55.1',
      browser_version: '140.0.0.0-test-double',
      async capture(options) { captured += 1; return createPassedEvidence(options); },
      async close() { driverClosed = true; }
    })
  });

  assert.equal(result.manifest.status, 'passed');
  assert.equal(result.manifest.expected_capture_count, 8);
  assert.equal(result.manifest.passed_capture_count, 8);
  assert.equal(result.manifest.failed_capture_count, 0);
  assert.equal(result.results.length, 8);
  assert.equal(captured, 8);
  assert.equal(runtimeStopped, true);
  assert.equal(driverClosed, true);
  assert.equal(result.manifest.source_theme_unchanged, true);
  assert.equal(result.manifest.runtime_stopped, true);
  assert.equal(result.manifest.temporary_workspace_cleaned, true);
  assert.equal(fs.existsSync(preparedThemeDirectory), false, 'Extracted temporary theme workspace must be removed.');
  assert.ok(fs.existsSync(path.join(result.output_directory, 'render-request.json')));
  assert.ok(fs.existsSync(path.join(result.output_directory, 'render-manifest.json')));

  const expectedPairs = new Set();
  for (const route of request.routes) for (const viewport of request.viewports) expectedPairs.add(`${route.id}:${viewport.id}`);
  for (const renderResult of result.results) {
    assert.equal(assertRenderResult(renderResult, request, root), renderResult);
    assert.equal(renderResult.architecture.profile_id, 'profile.current_calinium.v1');
    assert.equal(renderResult.generation.artifact.sha256, request.generation.artifact.sha256);
    assert.ok(expectedPairs.delete(`${renderResult.route.id}:${renderResult.viewport.id}`));
    assert.ok(fs.existsSync(path.join(result.output_directory, renderResult.screenshot.artifact_reference)));
    assert.ok(fs.existsSync(path.join(result.output_directory, 'results', `${renderResult.render_id}.json`)));
  }
  assert.equal(expectedPairs.size, 0, 'Every route and viewport pair must be captured exactly once.');

  await assert.rejects(() => captureStorefrontRender({ root, request, executeDevelopmentRender: false }), /disabled until --execute-development-render/);
  await assert.rejects(() => captureStorefrontRender({ root, request, executeDevelopmentRender: true }), /already exists/);
  return result;
}

async function testPhaseCComparison(currentRun) {
  const fixture = createEditorialFixture();
  const editorialRequest = createRenderRequest({
    root,
    fixture,
    architectureSelection: selectArchitecture({ profileId: fixture.architecture_profile_id, root })
  });
  assert.equal(currentRun.request.provenance.comparison_fixture_revision, PUBLIC_SYNTHETIC_COMPARISON.comparison_fixture_revision);
  assert.equal(editorialRequest.provenance.comparison_fixture_revision, PUBLIC_SYNTHETIC_COMPARISON.comparison_fixture_revision);
  assert.equal(comparisonKeyFor(currentRun.request), PUBLIC_SYNTHETIC_COMPARISON.comparison_key);
  assert.equal(comparisonKeyFor(editorialRequest), PUBLIC_SYNTHETIC_COMPARISON.comparison_key);
  assert.deepEqual(
    assertSamePublicSyntheticComparisonContract(currentRun.request, editorialRequest),
    PUBLIC_SYNTHETIC_COMPARISON
  );
  const editorialRun = await captureStorefrontRender({
    root,
    request: editorialRequest,
    executeDevelopmentRender: true,
    headless: true,
    now: () => '2026-08-13T00:00:00.000Z',
    runtimeFactory: async ({ request: runtimeRequest }) => ({
      mode: runtimeRequest.target.runtime_mode,
      shop_domain: runtimeRequest.target.shop_domain,
      theme_id: '9876543211',
      theme_role: 'development',
      remote_preview_url: null,
      local_proxy_origin: 'http://127.0.0.1:9294',
      async stop() { return true; }
    }),
    driverFactory: async () => ({
      engine: 'chromium',
      automation: 'playwright',
      automation_version: '1.55.1',
      browser_version: '140.0.0.0-test-double',
      async capture(options) {
        const evidence = createPassedEvidence(options);
        fs.writeFileSync(options.screenshotPath, blankPng(options.viewport.width, options.viewport.height, 1));
        evidence.screenshot.sha256 = sha256File(options.screenshotPath);
        evidence.screenshot.bytes = fs.statSync(options.screenshotPath).size;
        return evidence;
      },
      async close() {}
    })
  });
  const proof = assertStructuralDifferentiation({ currentResults: currentRun.results, editorialResults: editorialRun.results });
  assert.deepEqual(proof, { primary_screenshot_differences: 6, distinct_family_count: 5, shared_cart_family: 'family.cart.current_calinium.v1' });
  assert.equal(editorialRun.results.length, 8);
  for (const result of editorialRun.results) {
    assert.equal(result.architecture.profile_id, 'profile.editorial_discovery.v1');
    assert.equal(result.architecture_evidence.valid, true);
    assert.equal(result.architecture_evidence.artifact_structure_verified, true);
    assert.ok(result.architecture_evidence.assertions.every((assertion) => assertion.matched_count === 1));
  }
  return editorialRun;
}

async function testFailedCaptureArtifactCleanup(request) {
  const result = await captureStorefrontRender({
    root,
    request,
    executeDevelopmentRender: true,
    replace: true,
    now: () => '2026-08-13T00:00:00.000Z',
    runtimeFactory: async () => ({
      mode: request.target.runtime_mode,
      shop_domain: request.target.shop_domain,
      theme_id: '9876543210',
      theme_role: 'development',
      remote_preview_url: null,
      local_proxy_origin: 'http://127.0.0.1:9294',
      async stop() { return true; }
    }),
    driverFactory: async () => ({
      engine: 'chromium', automation: 'playwright', automation_version: '1.55.1', browser_version: '140.0.0.0-test-double',
      async capture({ screenshotPath, viewport }) {
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        fs.writeFileSync(screenshotPath, blankPng(viewport.width, viewport.height));
        throw new Error('injected capture failure after screenshot write');
      },
      async close() {}
    })
  });
  assert.equal(result.manifest.status, 'failed');
  const screenshotsRoot = path.join(result.output_directory, 'screenshots');
  const screenshotFiles = fs.existsSync(screenshotsRoot)
    ? fs.readdirSync(screenshotsRoot, { recursive: true }).filter((entry) => String(entry).endsWith('.png'))
    : [];
  assert.equal(screenshotFiles.length, 0, 'Failed captures must not leave orphan screenshot artifacts.');
}

function testPhaseCRegistrationAndIgnoredArtifacts(request) {
  const registry = loadArchitectureRegistry(root);
  assert.equal(registry.profiles.default_profile_id, 'profile.current_calinium.v1');
  assert.deepEqual(registry.profiles.profiles.map((profile) => profile.id), ['profile.current_calinium.v1', 'profile.editorial_discovery.v1']);
  assert.equal(request.architecture.profile_id, 'profile.current_calinium.v1', 'Phase C must not change default Render Requests.');
  const presenterEvidence = loadPresenterEvidenceRegistry(root);
  assert.equal(presenterEvidence.profiles.length, 2);
  assert.equal(presenterEvidence.evidence_revision, 'storefront-architecture-evidence-v1');
  execFileSync('git', ['check-ignore', '-q', 'output/storefront-renders/example/render.png'], { cwd: root });
  assert.match(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), /(^|\n)output\//);
}

async function run() {
  fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
  let request;
  try {
    createLocalThemeArchive();
    testControlledArtifactMaterialization();
    request = testRequestContract();
    testResultContract(request);
    await testConditionalReadiness();
    testRuntimeSafety(request);
    await testRuntimeStartupCleanup(request);
    testPhaseCRegistrationAndIgnoredArtifacts(request);
    const currentRun = await testEightCaptureBaseline(request);
    const editorialRun = await testPhaseCComparison(currentRun);
    await testFailedCaptureArtifactCleanup(request);
    console.log('Storefront render harness tests passed: request/result contracts=valid; profiles=current-Calinium+Editorial-Discovery; default=current-Calinium; routes=4; viewports=2; captures=8; structural presenter evidence=verified; stable IDs=passed; conditional readiness=passed; screenshot metadata=complete; runtime safety=read-only development-only; source preservation=passed; cleanup=confirmed; output ignore=confirmed.');
  } finally {
    fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
    if (request) fs.rmSync(path.join(root, 'output', 'storefront-renders', request.request_id), { recursive: true, force: true });
    if (fs.existsSync(EDITORIAL_TEST_MANIFEST)) {
      try {
        const editorialRequest = createRenderRequest({ root, fixture: createEditorialFixture() });
        fs.rmSync(path.join(root, 'output', 'storefront-renders', editorialRequest.request_id), { recursive: true, force: true });
      } catch {}
    }
  }
}

if (require.main === module) {
  run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { run };
