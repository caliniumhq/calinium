'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { comparisonKeyFor, PRESENTER_EVIDENCE_REVISION } = require('./contracts');
const { withoutShopifyStorefrontPassword } = require('./shopify-storefront-password-binding');

const CURRENT_PROFILE_ID = 'profile.current_calinium.v1';
const EDITORIAL_PROFILE_ID = 'profile.editorial_discovery.v1';
const APPROVED_FIXTURE_REVISION = 'comparison-fixture-0c881e4699c1cd3e33b0';
const APPROVED_COMPARISON_KEY = 'd7413cc5957c06221d6426210f86ae7cfd081bc2e66d55dbdb98a13b12d417f6';
const PUBLIC_SYNTHETIC_COMPARISON = Object.freeze({
  comparison_fixture_revision: 'comparison-fixture-b92f95a2fc9fdeb3f5d0',
  comparison_key: '0f2afd2181be102229fa4ab250bfb5dd368c3c7ebc61a8dfbf74f2663f24e36c'
});
const PRIMARY_DIFFERENTIATION_ROUTES = Object.freeze(['homepage', 'collection', 'product']);

function captureKey(result) { return `${result.route.id}:${result.viewport.id}`; }
function byCaptureKey(results) { return new Map(results.map((result) => [captureKey(result), result])); }

function assertComparisonContract(currentRequest, editorialRequest, expected, label) {
  if (currentRequest.architecture.profile_id !== CURRENT_PROFILE_ID) throw new Error('Architecture comparison input A must use current Calinium.');
  if (editorialRequest.architecture.profile_id !== EDITORIAL_PROFILE_ID) throw new Error('Architecture comparison input B must use Editorial Discovery.');
  if (currentRequest.provenance.comparison_fixture_revision !== expected.comparison_fixture_revision
    || editorialRequest.provenance.comparison_fixture_revision !== expected.comparison_fixture_revision) {
    throw new Error(`Architecture comparison does not use the ${label} fixture revision.`);
  }
  const currentKey = comparisonKeyFor(currentRequest);
  const editorialKey = comparisonKeyFor(editorialRequest);
  if (currentKey !== expected.comparison_key || editorialKey !== expected.comparison_key || currentKey !== editorialKey) {
    throw new Error(`Architecture comparison inputs do not share the ${label} comparison key.`);
  }
  if (JSON.stringify(currentRequest.routes) !== JSON.stringify(editorialRequest.routes)
    || JSON.stringify(currentRequest.viewports) !== JSON.stringify(editorialRequest.viewports)
    || JSON.stringify(currentRequest.target) !== JSON.stringify(editorialRequest.target)) {
    throw new Error('Architecture comparison changed a controlled route, viewport, or target input.');
  }
  return { ...expected };
}

function assertSameComparisonContract(currentRequest, editorialRequest) {
  return assertComparisonContract(currentRequest, editorialRequest, {
    comparison_fixture_revision: APPROVED_FIXTURE_REVISION,
    comparison_key: APPROVED_COMPARISON_KEY
  }, 'approved Phase B');
}

function assertSamePublicSyntheticComparisonContract(currentRequest, editorialRequest) {
  return assertComparisonContract(currentRequest, editorialRequest, PUBLIC_SYNTHETIC_COMPARISON, 'public synthetic');
}

function readThemeConfiguration(archivePath) {
  const childEnvironment = withoutShopifyStorefrontPassword(process.env);
  const entries = execFileSync('unzip', ['-Z1', archivePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: childEnvironment
  })
    .split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  const jsonEntries = entries.filter((entry) => entry === 'config/settings_data.json' || (entry.startsWith('templates/') && entry.endsWith('.json'))).sort();
  if (!jsonEntries.includes('config/settings_data.json') || !jsonEntries.includes('templates/index.json')) throw new Error('Architecture comparison artifact lacks canonical Shopify configuration JSON.');
  return Object.fromEntries(jsonEntries.map((entry) => {
    const source = execFileSync('unzip', ['-p', archivePath, entry], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: childEnvironment
    });
    return [entry, JSON.parse(source)];
  }));
}

function normalizedGeneratedSections(manifest) {
  return (manifest.generated_sections || []).map((section) => ({
    template: section.template,
    instance_id: section.instance_id,
    section_id: section.section_id,
    position: section.position,
    block_ids: section.block_ids
  }));
}

function nonArchitectureGenerationProvenance(manifest) {
  return {
    preset_id: manifest.preset_id,
    preset_version: manifest.preset_version,
    merchant_fixture: manifest.merchant_fixture,
    strategy_revision: manifest.strategy_revision,
    approved_block_plan_revision: manifest.approved_block_plan_revision,
    resource_snapshot_revision: manifest.resource_snapshot_revision,
    generator_version: manifest.generator_version,
    target_theme: manifest.target_theme,
    homepage_recipe: manifest.homepage_recipe,
    generated_templates: manifest.generated_templates,
    generated_sections: normalizedGeneratedSections(manifest),
    generated_block_count: manifest.generated_block_count,
    omission_summary: manifest.omission_summary,
    warning_summary: manifest.warning_summary
  };
}

function assertSameGenerationInputs({ currentManifest, editorialManifest, currentArchivePath, editorialArchivePath }) {
  if (JSON.stringify(nonArchitectureGenerationProvenance(currentManifest)) !== JSON.stringify(nonArchitectureGenerationProvenance(editorialManifest))) {
    throw new Error('Architecture comparison changed authoritative non-architecture generation provenance.');
  }
  if (currentManifest.architecture_selection?.profile_id !== CURRENT_PROFILE_ID
    || editorialManifest.architecture_selection?.profile_id !== EDITORIAL_PROFILE_ID) {
    throw new Error('Architecture comparison source manifests do not identify the two controlled profiles.');
  }
  if (JSON.stringify(readThemeConfiguration(currentArchivePath)) !== JSON.stringify(readThemeConfiguration(editorialArchivePath))) {
    throw new Error('Architecture comparison changed Shopify settings or template JSON; only registered presenter runtime may differ.');
  }
  if (JSON.stringify(currentManifest.architecture_runtime) === JSON.stringify(editorialManifest.architecture_runtime)) {
    throw new Error('Architecture comparison did not apply a distinct runtime presenter plan.');
  }
  return {
    non_architecture_provenance_equal: true,
    shopify_configuration_equal: true,
    architecture_runtime_distinct: true
  };
}

function assertCurrentBaseline({ request, results, baseline }) {
  if (request.architecture.profile_id !== baseline.architecture.profile_id
    || request.architecture.profile_version !== baseline.architecture.profile_version
    || request.architecture.selection_revision_id !== baseline.architecture.selection_revision_id) {
    throw new Error('Current-Calinium baseline architecture provenance changed.');
  }
  if (request.provenance.comparison_fixture_revision !== baseline.comparison.comparison_fixture_revision
    || comparisonKeyFor(request) !== baseline.comparison.comparison_key) {
    throw new Error('Current-Calinium baseline comparison provenance changed.');
  }
  if (request.generation.artifact.sha256 !== baseline.generation.artifact_sha256) {
    throw new Error('Current-Calinium materialized runtime artifact changed.');
  }
  const actual = byCaptureKey(results);
  if (actual.size !== baseline.captures.length) throw new Error('Current-Calinium baseline capture count changed.');
  for (const expected of baseline.captures) {
    const result = actual.get(`${expected.route}:${expected.viewport.id}`);
    if (!result || result.status !== 'passed') throw new Error(`Current-Calinium baseline capture ${expected.route}:${expected.viewport.id} did not pass.`);
    if (result.screenshot.width !== expected.screenshot.full_page_width
      || result.screenshot.height !== expected.screenshot.full_page_height
      || result.screenshot.sha256 !== expected.screenshot.sha256) {
      throw new Error(`Current-Calinium baseline capture ${expected.route}:${expected.viewport.id} changed. Do not update the approved baseline automatically.`);
    }
  }
  return true;
}

function assertStructuralDifferentiation({ currentResults, editorialResults }) {
  const current = byCaptureKey(currentResults);
  const editorial = byCaptureKey(editorialResults);
  if (current.size !== 8 || editorial.size !== 8) throw new Error('Architecture comparison requires the complete eight-cell matrix for both profiles.');
  let primaryScreenshotDifferences = 0;
  for (const key of current.keys()) {
    const left = current.get(key);
    const right = editorial.get(key);
    if (!right || left.route.path !== right.route.path || left.viewport.id !== right.viewport.id) throw new Error(`Architecture comparison cell ${key} is not aligned.`);
    if (left.status !== 'passed' || right.status !== 'passed') throw new Error(`Architecture comparison cell ${key} did not pass.`);
    if (left.architecture_evidence?.evidence_revision !== PRESENTER_EVIDENCE_REVISION
      || right.architecture_evidence?.evidence_revision !== PRESENTER_EVIDENCE_REVISION
      || !left.architecture_evidence.valid || !right.architecture_evidence.valid) {
      throw new Error(`Architecture comparison cell ${key} lacks valid structural evidence.`);
    }
    if (PRIMARY_DIFFERENTIATION_ROUTES.includes(left.route.id)) {
      const leftPresenters = left.architecture_evidence.assertions.map((item) => item.presenter_id).sort();
      const rightPresenters = right.architecture_evidence.assertions.map((item) => item.presenter_id).sort();
      if (JSON.stringify(leftPresenters) === JSON.stringify(rightPresenters)) throw new Error(`Architecture comparison route ${left.route.id} uses the same registered presenter evidence.`);
      if (left.screenshot.sha256 !== right.screenshot.sha256) primaryScreenshotDifferences += 1;
    }
    if (right.screenshot.width !== right.viewport.width) throw new Error(`Editorial Discovery ${key} has horizontal overflow (${right.screenshot.width}px capture for ${right.viewport.width}px viewport).`);
  }
  if (primaryScreenshotDifferences !== 6) throw new Error('All six primary Homepage/Collection/PDP comparison cells must render visibly distinct screenshots.');
  const currentFamilies = currentResults[0].architecture_evidence.selected_families;
  const editorialFamilies = editorialResults[0].architecture_evidence.selected_families;
  const currentByType = new Map(currentFamilies.map((item) => [item.family, item.family_id]));
  const editorialByType = new Map(editorialFamilies.map((item) => [item.family, item.family_id]));
  for (const family of ['header_navigation', 'product_card', 'collection_merchandising', 'product_detail', 'responsive_behavior']) {
    if (currentByType.get(family) === editorialByType.get(family)) throw new Error(`Editorial Discovery did not select a distinct ${family} family.`);
  }
  if (currentByType.get('cart') !== 'family.cart.current_calinium.v1'
    || editorialByType.get('cart') !== 'family.cart.current_calinium.v1') {
    throw new Error('Phase C must preserve the shared current-Calinium cart family.');
  }
  return { primary_screenshot_differences: primaryScreenshotDifferences, distinct_family_count: 5, shared_cart_family: 'family.cart.current_calinium.v1' };
}

function captureSummary(result) {
  return {
    route: result.route.id,
    path: result.route.path,
    viewport: { id: result.viewport.id, width: result.viewport.width, height: result.viewport.height },
    render_id: result.render_id,
    screenshot: result.screenshot ? {
      artifact_reference: result.screenshot.artifact_reference,
      full_page_width: result.screenshot.width,
      full_page_height: result.screenshot.height,
      sha256: result.screenshot.sha256
    } : null,
    template_identity: result.architecture_evidence?.template_identity || null,
    expected_section_identities: result.architecture_evidence?.section_identities || [],
    rendered_section_identities: result.architecture_evidence?.rendered_section_identities || [],
    rendered_presenters: result.architecture_evidence?.assertions.map((item) => ({
      family_id: item.family_id,
      presenter_id: item.presenter_id,
      matched_count: item.matched_count
    })) || [],
    status: result.status,
    error: result.error
  };
}

function createComparisonSummary({ currentRun, editorialRun, baseline, sameInputProof = null, generatedAt = new Date().toISOString() }) {
  const comparison = assertSameComparisonContract(currentRun.request, editorialRun.request);
  assertCurrentBaseline({ request: currentRun.request, results: currentRun.results, baseline });
  const differentiation = assertStructuralDifferentiation({ currentResults: currentRun.results, editorialResults: editorialRun.results });
  return {
    schema_version: '1.0',
    report_version: 'phase-c-architecture-comparison-v1',
    status: 'passed',
    generated_at: generatedAt,
    comparison,
    same_input_proof: sameInputProof,
    evidence_revision: PRESENTER_EVIDENCE_REVISION,
    current_baseline: { status: 'unchanged', request_id: currentRun.request.request_id, captures: currentRun.results.map(captureSummary) },
    editorial_discovery: { status: 'passed', request_id: editorialRun.request.request_id, captures: editorialRun.results.map(captureSummary) },
    differentiation,
    source_theme_unchanged: currentRun.manifest.source_theme_unchanged && editorialRun.manifest.source_theme_unchanged,
    runtime_stopped: currentRun.manifest.runtime_stopped && editorialRun.manifest.runtime_stopped,
    temporary_workspaces_cleaned: currentRun.manifest.temporary_workspace_cleaned && editorialRun.manifest.temporary_workspace_cleaned,
    shopify_operations: { write_operations: false, upload: false, publish: false }
  };
}

function writeComparisonSummary(file, summary) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`);
}

module.exports = {
  CURRENT_PROFILE_ID,
  EDITORIAL_PROFILE_ID,
  APPROVED_FIXTURE_REVISION,
  APPROVED_COMPARISON_KEY,
  PUBLIC_SYNTHETIC_COMPARISON,
  PRIMARY_DIFFERENTIATION_ROUTES,
  captureKey,
  assertSameComparisonContract,
  assertSamePublicSyntheticComparisonContract,
  readThemeConfiguration,
  nonArchitectureGenerationProvenance,
  assertSameGenerationInputs,
  assertCurrentBaseline,
  assertStructuralDifferentiation,
  captureSummary,
  createComparisonSummary,
  writeComparisonSummary
};
