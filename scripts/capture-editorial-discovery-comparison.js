#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createRenderRequest } = require('../ai/storefront-render/contracts');
const { captureStorefrontRender, writeJson } = require('../ai/storefront-render/capture-harness');
const { materializeControlledArtifact } = require('../ai/storefront-render/materialize-controlled-artifact');
const {
  assertSameComparisonContract,
  assertSameGenerationInputs,
  assertCurrentBaseline,
  createComparisonSummary,
  writeComparisonSummary
} = require('../ai/storefront-render/architecture-comparison');
const { generateEditorialDiscoveryArtifact } = require('./generate-editorial-discovery-artifact');

const root = path.resolve(__dirname, '..');
const CURRENT_FIXTURE = 'fixtures/storefront-render-current-calinium.json';
const EDITORIAL_FIXTURE = 'fixtures/storefront-render-editorial-discovery.json';
const BASELINE_EVIDENCE = 'fixtures/storefront-render-current-calinium-baseline.json';

function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8')); }

function parseArgs(argv) {
  const options = { port: 9294, replace: false, executeDevelopmentRender: false, headless: true, requestOnly: false, verbose: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--port') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--port requires a value.');
      options.port = Number(value);
      index += 1;
    } else if (argument === '--replace') options.replace = true;
    else if (argument === '--execute-development-render') options.executeDevelopmentRender = true;
    else if (argument === '--headed') options.headless = false;
    else if (argument === '--request-only') options.requestOnly = true;
    else if (argument === '--verbose') options.verbose = true;
    else throw new Error(`Unknown Editorial Discovery comparison option ${argument}.`);
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) throw new Error('--port must be an integer from 1024 through 65535.');
  return options;
}

function generateComparisonArtifacts(options) {
  const currentFixture = readJson(CURRENT_FIXTURE);
  const currentArchivePath = path.resolve(root, currentFixture.generation_fixture.source_artifact_reference);
  const currentManifestPath = path.resolve(root, currentFixture.generation_fixture.source_artifact_manifest_reference);
  if (!fs.existsSync(currentArchivePath) || !fs.existsSync(currentManifestPath)) {
    throw new Error('The approved Current Calinium source artifact is unavailable. Regenerate it separately and revalidate the Phase B baseline before comparison.');
  }
  const currentManifest = JSON.parse(fs.readFileSync(currentManifestPath, 'utf8'));
  if (currentManifest.preset_id !== 'essential' || currentManifest.architecture_selection?.profile_id !== 'profile.current_calinium.v1') {
    throw new Error('The Current Calinium source artifact does not carry approved baseline provenance.');
  }
  const editorial = generateEditorialDiscoveryArtifact({ repositoryRoot: root, verbose: options.verbose });
  const sameInputProof = assertSameGenerationInputs({
    currentManifest,
    editorialManifest: editorial.manifest,
    currentArchivePath,
    editorialArchivePath: path.resolve(root, editorial.zip_path)
  });
  return { current: { manifest: currentManifest, zip_path: currentFixture.generation_fixture.source_artifact_reference }, editorial, sameInputProof };
}

function prepareRequest(fixture) {
  materializeControlledArtifact({ root, fixture });
  return createRenderRequest({ root, fixture });
}

function writeRequestOnly(request, replace) {
  const outputDirectory = path.join(root, 'output', 'storefront-renders', request.request_id);
  if (fs.existsSync(outputDirectory) && !replace) throw new Error(`Render Request output ${request.request_id} already exists.`);
  if (fs.existsSync(outputDirectory)) fs.rmSync(outputDirectory, { recursive: true, force: true });
  writeJson(path.join(outputDirectory, 'render-request.json'), request);
  return outputDirectory;
}

async function runComparison(options = parseArgs(process.argv.slice(2))) {
  const generatedArtifacts = generateComparisonArtifacts(options);
  const currentFixture = readJson(CURRENT_FIXTURE);
  const editorialFixture = readJson(EDITORIAL_FIXTURE);
  const currentRequest = prepareRequest(currentFixture);
  const editorialRequest = prepareRequest(editorialFixture);
  assertSameComparisonContract(currentRequest, editorialRequest);
  if (options.requestOnly) {
    return {
      current_request: currentRequest,
      editorial_request: editorialRequest,
      current_output: writeRequestOnly(currentRequest, options.replace),
      editorial_output: writeRequestOnly(editorialRequest, options.replace),
      summary: null
    };
  }
  const currentRun = await captureStorefrontRender({
    root,
    request: currentRequest,
    port: options.port,
    replace: options.replace,
    executeDevelopmentRender: options.executeDevelopmentRender,
    headless: options.headless
  });
  assertCurrentBaseline({ request: currentRequest, results: currentRun.results, baseline: readJson(BASELINE_EVIDENCE) });
  const editorialRun = await captureStorefrontRender({
    root,
    request: editorialRequest,
    port: options.port,
    replace: options.replace,
    executeDevelopmentRender: options.executeDevelopmentRender,
    headless: options.headless
  });
  const summary = createComparisonSummary({ currentRun, editorialRun, baseline: readJson(BASELINE_EVIDENCE), sameInputProof: generatedArtifacts.sameInputProof });
  writeComparisonSummary(path.join(root, 'output', 'storefront-renders', 'phase-c-comparison-summary.json'), summary);
  return { currentRun, editorialRun, summary };
}

async function main() {
  try {
    const result = await runComparison();
    if (!result.summary) {
      console.log(`Phase C Render Requests created: current=${result.current_request.request_id}; editorial=${result.editorial_request.request_id}; fixture=${result.current_request.provenance.comparison_fixture_revision}.`);
      return;
    }
    console.log(`Phase C architecture comparison passed: fixture=${result.summary.comparison.comparison_fixture_revision}; key=${result.summary.comparison.comparison_key}; current=8/8 unchanged; editorial=8/8; primary-differences=${result.summary.differentiation.primary_screenshot_differences}/6; source-unchanged=${result.summary.source_theme_unchanged}; cleanup=${result.summary.temporary_workspaces_cleaned}.`);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  CURRENT_FIXTURE,
  EDITORIAL_FIXTURE,
  BASELINE_EVIDENCE,
  parseArgs,
  generateComparisonArtifacts,
  prepareRequest,
  runComparison
};
