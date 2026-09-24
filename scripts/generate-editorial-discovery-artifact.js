#!/usr/bin/env node
'use strict';

const path = require('path');
const { generatePresetDemo, loadFixtureMatrix } = require('./generate-preset-demos');

const root = path.resolve(__dirname, '..');
const PROFILE_ID = 'profile.editorial_discovery.v1';
const ARTIFACT_ID = 'editorial-discovery-v1';
const GENERATION_ID = 'generation-run-architecture-editorial-discovery-essential';
const ZIP_NAME = 'calinium-editorial-discovery-demo.zip';

function generateEditorialDiscoveryArtifact({ repositoryRoot = root, verbose = false } = {}) {
  const { registry, byPreset } = loadFixtureMatrix(repositoryRoot);
  const fixture = byPreset.get('essential');
  const result = generatePresetDemo({
    fixture,
    registry,
    repositoryRoot,
    outputDirectory: path.join(repositoryRoot, 'output', 'architecture-profile-themes'),
    verbose,
    architectureProfileId: PROFILE_ID,
    artifactId: ARTIFACT_ID,
    generationId: GENERATION_ID,
    zipName: ZIP_NAME
  });
  if (result.manifest.architecture_selection?.profile_id !== PROFILE_ID) throw new Error('Editorial Discovery artifact did not preserve the explicit architecture selection.');
  if (result.manifest.generation_id !== GENERATION_ID) throw new Error('Editorial Discovery artifact generation identity is inconsistent.');
  if (result.manifest.architecture_runtime?.profile_id !== PROFILE_ID) throw new Error('Editorial Discovery artifact lacks matching applied runtime provenance.');
  return result;
}

function main() {
  try {
    const result = generateEditorialDiscoveryArtifact({ verbose: process.argv.includes('--verbose') });
    console.log(`Editorial Discovery artifact generated: ${result.zip_path}; sha256=${result.zip_sha256}; theme-check=${result.report.theme_check.status}; source-unchanged=${result.report.source_theme_unchanged}; cleanup=${result.report.temporary_workspace_cleaned}.`);
  } catch (error) {
    console.error(error.stack || error.message);
    if (error.validation?.checks?.theme_check?.output) console.error(error.validation.checks.theme_check.output);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  PROFILE_ID,
  ARTIFACT_ID,
  GENERATION_ID,
  ZIP_NAME,
  generateEditorialDiscoveryArtifact
};
