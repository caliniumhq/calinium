#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  loadRouteRegistry,
  loadViewportRegistry,
  loadTargetRegistry,
  loadPresenterEvidenceRegistry,
  comparisonFixtureRevision
} = require('../ai/storefront-render/contracts');
const {
  ALLOWED_THEME_ROOTS,
  FORBIDDEN_THEME_DEV_FLAGS,
  assertSafeThemeDevArgs
} = require('../ai/storefront-render/shopify-development-runtime');
const { loadArchitectureRegistry } = require('../ai/architecture/architecture-registry');
const { PUBLIC_SYNTHETIC_COMPARISON } = require('../ai/storefront-render/architecture-comparison');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function requireFile(relativePath) {
  const file = path.join(root, relativePath);
  assert.ok(fs.existsSync(file), `Required storefront render file is missing: ${relativePath}.`);
  return file;
}

function validateJsonContracts() {
  const requestSchema = readJson('schemas/calinium-storefront-render-request.schema.json');
  const resultSchema = readJson('schemas/calinium-storefront-render-result.schema.json');
  const presenterSchema = readJson('schemas/calinium-storefront-render-presenter-evidence.schema.json');
  assert.equal(requestSchema.properties.contract_version.const, 'storefront-render-request-v1');
  assert.equal(resultSchema.properties.contract_version.const, 'storefront-render-result-v1');
  assert.ok(requestSchema.required.includes('architecture'));
  assert.ok(requestSchema.required.includes('generation'));
  assert.ok(requestSchema.required.includes('routes'));
  assert.ok(requestSchema.required.includes('viewports'));
  assert.ok(resultSchema.required.includes('screenshot'));
  assert.ok(resultSchema.required.includes('browser'));
  assert.ok(resultSchema.required.includes('readiness'));
  assert.ok(resultSchema.required.includes('deterministic_validation'));
  assert.ok(resultSchema.properties.architecture_evidence);
  assert.equal(presenterSchema.properties.evidence_revision.const, 'storefront-architecture-evidence-v1');
  assert.ok(resultSchema.properties.screenshot.required.includes('sha256'));
  assert.ok(resultSchema.properties.screenshot.required.includes('width'));
  assert.ok(resultSchema.properties.screenshot.required.includes('height'));
}

function validateRegistriesAndFixture() {
  const routes = loadRouteRegistry(root);
  const viewports = loadViewportRegistry(root);
  const fixture = readJson('fixtures/storefront-render-current-calinium.json');
  const editorialFixture = readJson('fixtures/storefront-render-editorial-discovery.json');
  const targets = readJson('config/storefront-render-targets.json');
  assert.deepEqual(routes.routes.map((route) => route.id), ['homepage', 'collection', 'product', 'cart']);
  assert.deepEqual(viewports.viewports.map((viewport) => viewport.id), ['desktop-v1', 'mobile-v1']);
  assert.deepEqual(viewports.viewports.map(({ width, height }) => ({ width, height })), [
    { width: 1440, height: 900 },
    { width: 390, height: 844 }
  ]);
  assert.equal(fixture.architecture_profile_id, 'profile.current_calinium.v1');
  assert.equal(editorialFixture.architecture_profile_id, 'profile.editorial_discovery.v1');
  for (const key of ['schema_version', 'fixture_version', 'fixture_id', 'target', 'entities', 'runtime_binding_policy', 'requested_routes', 'requested_viewports']) {
    assert.deepEqual(editorialFixture[key], fixture[key], `Phase C comparison must preserve controlled fixture field ${key}.`);
  }
  assert.equal(editorialFixture.generation_fixture.fixture_id, fixture.generation_fixture.fixture_id);
  assert.equal(editorialFixture.generation_fixture.preset_id, fixture.generation_fixture.preset_id);
  assert.equal(fixture.fixture_version, '1.0.0');
  assert.deepEqual(fixture.requested_routes, ['homepage', 'collection', 'product', 'cart']);
  assert.deepEqual(fixture.requested_viewports, ['desktop-v1', 'mobile-v1']);
  assert.equal(fixture.target.runtime_mode, 'shopify_development_proxy');
  assert.equal(fixture.target.expected_theme_role, 'development');
  assert.equal(targets.targets.length, 1);
  assert.equal(targets.targets[0].id, fixture.target.target_id);
  assert.equal(targets.targets[0].shop_domain, fixture.target.shop_domain);
  assert.match(fixture.target.shop_domain, /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/);
  assert.equal(fixture.entities.collection.handle, 'hydrogen');
  assert.equal(fixture.entities.product.handle, 'the-collection-snowboard-hydrogen');
  assert.match(fixture.entities.collection.remote_gid, /^gid:\/\/shopify\/Collection\/[0-9]+$/);
  assert.match(fixture.entities.product.remote_gid, /^gid:\/\/shopify\/Product\/[0-9]+$/);
  const comparisonInputs = { routeRegistry: routes, viewportRegistry: viewports, targetRegistry: loadTargetRegistry(root) };
  assert.equal(comparisonFixtureRevision({ fixture, ...comparisonInputs }), PUBLIC_SYNTHETIC_COMPARISON.comparison_fixture_revision);
  assert.equal(comparisonFixtureRevision({ fixture: editorialFixture, ...comparisonInputs }), PUBLIC_SYNTHETIC_COMPARISON.comparison_fixture_revision);
}

function validateApprovedBaselineEvidence() {
  const evidence = readJson('fixtures/storefront-render-current-calinium-baseline.json');
  const routes = loadRouteRegistry(root);
  const viewports = loadViewportRegistry(root);
  assert.equal(evidence.schema_version, '1.0');
  assert.equal(evidence.evidence_version, '1.0.0');
  assert.equal(evidence.status, 'approved');
  assert.deepEqual(evidence.architecture, {
    profile_id: 'profile.current_calinium.v1',
    profile_version: '1.0.0',
    selection_revision_id: 'architecture-selection-ccbcab2a5f566e2b1b6f'
  });
  assert.equal(evidence.comparison.comparison_fixture_revision, 'comparison-fixture-0c881e4699c1cd3e33b0');
  assert.equal(evidence.comparison.comparison_key, 'd7413cc5957c06221d6426210f86ae7cfd081bc2e66d55dbdb98a13b12d417f6');
  assert.equal(evidence.contracts.render_request, 'storefront-render-request-v1');
  assert.equal(evidence.contracts.render_result, 'storefront-render-result-v1');
  assert.equal(evidence.contracts.render_revision, 'storefront-render-v1');
  assert.equal(evidence.contracts.readiness_strategy, 'storefront-readiness-v1');
  assert.equal(evidence.contracts.capture_policy_revision, 'storefront-capture-policy-v1');
  assert.equal(evidence.contracts.comparison_contract, 'storefront-architecture-comparison-v1');
  assert.equal(evidence.contracts.controlled_materializer, 'controlled-storefront-artifact-v1');
  const expectedPairs = routes.routes.flatMap((route) => viewports.viewports.map((viewport) => `${route.id}:${viewport.id}`));
  assert.deepEqual(evidence.captures.map((capture) => `${capture.route}:${capture.viewport.id}`), expectedPairs);
  assert.equal(evidence.captures.length, 8);
  assert.equal(new Set(evidence.captures.map((capture) => capture.render_id)).size, 8);
  assert.equal(new Set(evidence.captures.map((capture) => capture.screenshot.sha256)).size, 8);
  for (const capture of evidence.captures) {
    const route = routes.byId.get(capture.route);
    const viewport = viewports.byId.get(capture.viewport.id);
    assert.ok(route && viewport, `Unknown approved baseline capture ${capture.route}:${capture.viewport.id}.`);
    assert.equal(capture.viewport.width, viewport.width);
    assert.equal(capture.viewport.height, viewport.height);
    assert.match(capture.render_id, /^render-[a-f0-9]{20}$/);
    assert.match(capture.screenshot.sha256, /^[a-f0-9]{64}$/);
    assert.ok(capture.screenshot.full_page_width >= viewport.width);
    assert.ok(capture.screenshot.full_page_height >= viewport.height);
    assert.equal(capture.screenshot.artifact_reference, `screenshots/profile.current_calinium.v1/${capture.route}/${capture.viewport.id}--${capture.render_id}.png`);
  }
  const mobileOverflow = evidence.known_observations.find((item) => item.id === 'current-calinium-mobile-homepage-horizontal-overflow');
  assert.ok(mobileOverflow, 'The approved current-Calinium mobile overflow observation must remain tracked.');
  assert.deepEqual({ width: mobileOverflow.browser_viewport_width, height: mobileOverflow.browser_viewport_height }, { width: 390, height: 844 });
  assert.equal(mobileOverflow.full_page_png_width, 657);
  assert.equal(evidence.storage.screenshot_binaries_tracked, false);
  const runtimeEvidenceRoot = path.join(root, evidence.storage.runtime_output_root);
  const runtimeManifestPath = path.join(runtimeEvidenceRoot, 'render-manifest.json');
  if (fs.existsSync(runtimeManifestPath)) {
    const runtimeManifest = JSON.parse(fs.readFileSync(runtimeManifestPath, 'utf8'));
    assert.equal(runtimeManifest.status, 'passed');
    assert.equal(runtimeManifest.request_id, evidence.generation.request_id);
    assert.equal(runtimeManifest.comparison_fixture_revision, evidence.comparison.comparison_fixture_revision);
    assert.equal(runtimeManifest.comparison_key, evidence.comparison.comparison_key);
    const runtimeCaptures = runtimeManifest.result_references.map((reference) => JSON.parse(fs.readFileSync(path.join(runtimeEvidenceRoot, reference), 'utf8')));
    for (const approved of evidence.captures) {
      const actual = runtimeCaptures.find((capture) => capture.render_id === approved.render_id);
      assert.ok(actual, `Approved baseline render ${approved.render_id} is absent from available runtime evidence.`);
      assert.equal(actual.screenshot.sha256, approved.screenshot.sha256);
      assert.equal(actual.screenshot.width, approved.screenshot.full_page_width);
      assert.equal(actual.screenshot.height, approved.screenshot.full_page_height);
    }
  }
}

function validatePhaseBoundary() {
  const registry = loadArchitectureRegistry(root);
  assert.equal(registry.profiles.default_profile_id, 'profile.current_calinium.v1');
  assert.deepEqual(registry.profiles.profiles.map((profile) => profile.id), ['profile.current_calinium.v1', 'profile.editorial_discovery.v1']);
  const evidence = loadPresenterEvidenceRegistry(root);
  assert.deepEqual(evidence.profiles.map((profile) => profile.profile_id), ['profile.current_calinium.v1', 'profile.editorial_discovery.v1']);
  assert.equal(evidence.evidence_revision, 'storefront-architecture-evidence-v1');
  for (const profile of evidence.profiles) assert.deepEqual(profile.routes.map((route) => route.route_id), ['homepage', 'collection', 'product', 'cart']);
}

function validateRuntimeSafety() {
  const safeArgs = ['theme', 'dev', '--path', '/generated/theme', '--store', 'example.myshopify.com', '--live-reload', 'off'];
  assert.deepEqual(assertSafeThemeDevArgs(safeArgs), safeArgs);
  assert.deepEqual([...FORBIDDEN_THEME_DEV_FLAGS].sort(), ['--allow-live', '--live', '--publish', '--store-password', '--theme-editor-sync'].sort());
  for (const flag of FORBIDDEN_THEME_DEV_FLAGS) assert.throws(() => assertSafeThemeDevArgs([...safeArgs, flag]), /forbids Shopify CLI flag/);
  assert.throws(() => assertSafeThemeDevArgs([...safeArgs, '--theme', '123']), /cannot target an arbitrary existing theme/);
  assert.deepEqual([...ALLOWED_THEME_ROOTS].sort(), ['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'].sort());

  const runtimeSource = fs.readFileSync(path.join(root, 'ai/storefront-render/shopify-development-runtime.js'), 'utf8');
  const harnessSource = fs.readFileSync(path.join(root, 'ai/storefront-render/capture-harness.js'), 'utf8');
  const driverSource = fs.readFileSync(path.join(root, 'ai/storefront-render/playwright-capture-driver.js'), 'utf8');
  const materializerSource = fs.readFileSync(path.join(root, 'ai/storefront-render/materialize-controlled-artifact.js'), 'utf8');
  assert.match(runtimeSource, /'theme', 'dev'/);
  assert.match(runtimeSource, /'--live-reload', 'off'/);
  assert.match(runtimeSource, /assertDevelopmentTarget/);
  assert.match(harnessSource, /sourceSnapshot\(root\)/);
  assert.match(harnessSource, /sameSnapshot\(themeBefore, sourceSnapshot\(root\)\)/);
  assert.match(harnessSource, /--execute-development-render/);
  assert.match(driverSource, /document\.readyState === 'complete'/);
  assert.match(driverSource, /document\.fonts/);
  assert.match(driverSource, /document\.images/);
  assert.match(driverSource, /waitForLayoutStability/);
  assert.match(materializerSource, /resource_binding_revision/);
  assert.match(materializerSource, /comparison_fixture_revision/);
  assert.match(materializerSource, /assertNoFixtureReferences/);
  assert.match(runtimeSource, /stopChildProcess/);
  assert.match(driverSource, /redactSensitiveText/);
  assert.doesNotMatch(`${runtimeSource}\n${harnessSource}\n${driverSource}\n${materializerSource}`, /write_themes/);
}

function validateDependencyAndSyntax() {
  const packageJson = readJson('package.json');
  assert.equal(packageJson.devDependencies.playwright, '1.55.1');
  assert.equal(packageJson.scripts['capture:storefront'], 'node scripts/capture-storefront-render.js');
  assert.equal(packageJson.scripts['capture:current-calinium'], 'node scripts/capture-current-calinium-baseline.js');
  assert.equal(packageJson.scripts['generate:editorial-discovery-artifact'], 'node scripts/generate-editorial-discovery-artifact.js');
  assert.equal(packageJson.scripts['capture:editorial-discovery-comparison'], 'node scripts/capture-editorial-discovery-comparison.js');
  assert.equal(packageJson.scripts['test:storefront-render'], 'node scripts/test-storefront-render.js');
  assert.equal(packageJson.scripts['validate:storefront-render'], 'node scripts/validate-storefront-render.js');
  assert.ok(require.resolve('playwright', { paths: [root] }));
  const { chromium } = require('playwright');
  assert.ok(path.isAbsolute(chromium.executablePath()), 'The pinned Playwright dependency did not resolve a Chromium runtime path.');

  const scripts = [
    'ai/storefront-render/contracts.js',
    'ai/storefront-render/index.js',
    'ai/storefront-render/shopify-development-runtime.js',
    'ai/storefront-render/playwright-capture-driver.js',
    'ai/storefront-render/materialize-controlled-artifact.js',
    'ai/storefront-render/capture-harness.js',
    'ai/storefront-render/architecture-comparison.js',
    'scripts/capture-storefront-render.js',
    'scripts/capture-current-calinium-baseline.js',
    'scripts/generate-editorial-discovery-artifact.js',
    'scripts/capture-editorial-discovery-comparison.js',
    'scripts/test-storefront-render.js',
    'scripts/validate-storefront-render.js'
  ];
  for (const relativePath of scripts) {
    const file = requireFile(relativePath);
    execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });
  }
}

function validateArtifactPolicy() {
  const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(ignore, /(^|\n)output\//);
  execFileSync('git', ['check-ignore', '-q', 'output/storefront-renders/validation/example.png'], { cwd: root });
  requireFile('docs/architecture/storefront-render-capture-harness.md');
  requireFile('config/storefront-render-presenter-evidence.json');
  requireFile('schemas/calinium-storefront-render-presenter-evidence.schema.json');
  requireFile('fixtures/storefront-render-editorial-discovery.json');
}

function run() {
  validateJsonContracts();
  validateRegistriesAndFixture();
  validateApprovedBaselineEvidence();
  validatePhaseBoundary();
  validateRuntimeSafety();
  validateDependencyAndSyntax();
  validateArtifactPolicy();
  console.log('Storefront render harness validation passed: contracts=versioned; routes=4; viewports=2; profiles=2; fixture semantics=shared; approved current baseline evidence=8-captures unchanged; mobile-overflow-observation=preserved; Editorial presenter evidence=registered; Playwright=1.55.1; Chromium-target=resolved; readiness=condition-driven; development-theme safety=passed; live/publish/write scopes=absent; output artifacts=ignored; syntax=valid.');
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
