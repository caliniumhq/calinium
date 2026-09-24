'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { isPathInside } = require('../theme-generator/utils');
const { withoutShopifyStorefrontPassword } = require('./shopify-storefront-password-binding');
const {
  digest,
  sha256File,
  loadRouteRegistry,
  loadViewportRegistry,
  loadTargetRegistry,
  comparisonFixtureRevision
} = require('./contracts');
const { archiveEntries, validateArchiveEntries, validateThemeDirectory } = require('./shopify-development-runtime');

const MATERIALIZER_VERSION = 'controlled-storefront-artifact-v1';
const FIXED_ARCHIVE_TIME = new Date('2000-01-01T00:00:00.000Z');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function resourceRuntimeValue(settingId, fixture) {
  const bindingName = fixture.runtime_binding_policy.bind[settingId];
  if (!bindingName) return undefined;
  const resource = fixture.entities[bindingName];
  if (!resource || resource.resolution_source !== 'controlled_render_fixture') throw new Error(`Controlled render binding ${settingId} has no trusted fixture resource.`);
  if (resource.runtime_value) return resource.runtime_value;
  if (resource.handle) return resource.handle;
  throw new Error(`Controlled render binding ${settingId} has no Shopify runtime value.`);
}

function materializeSettings(settings, fixture, changes, location) {
  for (const [settingId, value] of Object.entries(settings || {})) {
    if (typeof value !== 'string' || !value.startsWith('shopify://fixture-')) continue;
    const runtimeValue = resourceRuntimeValue(settingId, fixture);
    if (runtimeValue !== undefined) {
      settings[settingId] = runtimeValue;
      changes.bound.push({ location: `${location}.${settingId}`, setting_id: settingId, resource: fixture.runtime_binding_policy.bind[settingId] });
      continue;
    }
    if (fixture.runtime_binding_policy.omit_unavailable_optional_kinds.includes(settingId)) {
      delete settings[settingId];
      changes.omitted.push({ location: `${location}.${settingId}`, setting_id: settingId, reason: 'controlled_fixture_resource_unavailable' });
      continue;
    }
    throw new Error(`Generated fixture reference at ${location}.${settingId} has no controlled runtime binding or omission rule.`);
  }
}

function materializeTemplate(template, fixture, relativePath) {
  const changes = { bound: [], omitted: [] };
  for (const [sectionId, section] of Object.entries(template.sections || {})) {
    materializeSettings(section.settings, fixture, changes, `${relativePath}.sections.${sectionId}.settings`);
    for (const [blockId, block] of Object.entries(section.blocks || {})) {
      materializeSettings(block.settings, fixture, changes, `${relativePath}.sections.${sectionId}.blocks.${blockId}.settings`);
    }
  }
  return changes;
}

function listFiles(directory, relative = '') {
  const result = [];
  for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(directory, child));
    else result.push(child);
  }
  return result;
}

function assertNoFixtureReferences(themeDirectory) {
  const references = [];
  for (const relative of listFiles(themeDirectory).filter((file) => file.endsWith('.json'))) {
    const source = fs.readFileSync(path.join(themeDirectory, relative), 'utf8');
    if (source.includes('shopify://fixture-')) references.push(relative);
  }
  if (references.length) throw new Error(`Controlled render artifact retains unresolved fixture references in ${references.join(', ')}.`);
}

function deterministicZip(themeDirectory, destination) {
  const files = listFiles(themeDirectory);
  if (!files.length) throw new Error('Controlled render artifact contains no theme files.');
  for (const relative of files) fs.utimesSync(path.join(themeDirectory, relative), FIXED_ARCHIVE_TIME, FIXED_ARCHIVE_TIME);
  if (fs.existsSync(destination)) fs.rmSync(destination, { force: true });
  execFileSync('zip', ['-q', '-X', destination, ...files], {
    cwd: themeDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: withoutShopifyStorefrontPassword(process.env)
  });
  return { file_count: files.length, compressed_bytes: fs.statSync(destination).size, sha256: sha256File(destination) };
}

function safeResourceSummary(fixture) {
  return Object.fromEntries(Object.entries(fixture.entities).map(([key, resource]) => [key, {
    resource_id: resource.resource_id,
    remote_gid: resource.remote_gid,
    handle: resource.handle || null,
    source_revision: resource.source_revision,
    resolution_source: resource.resolution_source
  }]));
}

function materializeControlledArtifact({ root, fixture, now = () => new Date().toISOString() }) {
  const outputRoot = path.resolve(root, 'output');
  const finalArchive = path.resolve(root, fixture.generation_fixture.artifact_reference);
  const finalManifest = path.resolve(root, fixture.generation_fixture.artifact_manifest_reference);
  const sourceArchive = path.resolve(root, fixture.generation_fixture.source_artifact_reference);
  const sourceManifestPath = path.resolve(root, fixture.generation_fixture.source_artifact_manifest_reference);
  for (const file of [finalArchive, finalManifest, sourceArchive, sourceManifestPath]) {
    if (!isPathInside(outputRoot, file)) throw new Error('Controlled render artifact paths must remain inside output/.');
  }
  if (!fs.existsSync(sourceArchive) || !fs.existsSync(sourceManifestPath)) throw new Error('The controlled render source package is unavailable. Generate the configured preset demo first.');
  const sourceManifest = readJson(sourceManifestPath);
  const sourceSha256 = sha256File(sourceArchive);
  if (sourceManifest.zip?.sha256 !== sourceSha256) throw new Error('Controlled render source package checksum does not match its manifest.');
  if (sourceManifest.preset_id !== fixture.generation_fixture.preset_id
    || !sourceManifest.architecture_selection
    || sourceManifest.architecture_selection.profile_id !== fixture.architecture_profile_id) {
    throw new Error('Controlled render source manifest lacks matching preset or architecture provenance.');
  }
  const bindingBase = {
    materializer_version: MATERIALIZER_VERSION,
    policy: fixture.runtime_binding_policy,
    resources: safeResourceSummary(fixture),
    source_artifact_sha256: sourceSha256
  };
  const bindingRevision = `render-binding-${digest(bindingBase).slice(0, 20)}`;
  const fixtureRevision = comparisonFixtureRevision({
    fixture,
    routeRegistry: loadRouteRegistry(root),
    viewportRegistry: loadViewportRegistry(root),
    targetRegistry: loadTargetRegistry(root)
  });
  const destinationDirectory = path.dirname(finalArchive);
  const workspace = path.join(outputRoot, '.storefront-render-materialization', `${bindingRevision}-${process.pid}`);
  const themeDirectory = path.join(workspace, 'theme');
  const stagedArchive = path.join(workspace, path.basename(finalArchive));
  fs.rmSync(workspace, { recursive: true, force: true });
  fs.mkdirSync(themeDirectory, { recursive: true });
  const changes = { bound: [], omitted: [] };
  try {
    const entryErrors = validateArchiveEntries(archiveEntries(sourceArchive));
    if (entryErrors.length) throw new Error(`Controlled render source package is unsafe: ${entryErrors.join(' ')}`);
    execFileSync('unzip', ['-q', sourceArchive, '-d', themeDirectory], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: withoutShopifyStorefrontPassword(process.env)
    });
    validateThemeDirectory(themeDirectory);
    for (const relative of listFiles(path.join(themeDirectory, 'templates')).filter((file) => file.endsWith('.json'))) {
      const file = path.join(themeDirectory, 'templates', relative);
      const template = readJson(file);
      const result = materializeTemplate(template, fixture, `templates/${relative}`);
      changes.bound.push(...result.bound);
      changes.omitted.push(...result.omitted);
      writeJson(file, template);
    }
    assertNoFixtureReferences(themeDirectory);
    const zip = deterministicZip(themeDirectory, stagedArchive);
    fs.mkdirSync(destinationDirectory, { recursive: true });
    fs.renameSync(stagedArchive, finalArchive);
    const manifest = {
      version: 1,
      export_type: 'calinium_controlled_storefront_render_artifact',
      status: 'passed',
      materializer_version: MATERIALIZER_VERSION,
      resource_binding_revision: bindingRevision,
      fixture_provenance: {
        fixture_id: fixture.fixture_id,
        fixture_version: fixture.fixture_version,
        comparison_fixture_revision: fixtureRevision
      },
      generated_at: now(),
      generation_id: sourceManifest.generation_id || `generation-run-preset-demo-${sourceManifest.preset_id}`,
      preset_id: sourceManifest.preset_id,
      preset_version: sourceManifest.preset_version,
      merchant_fixture: sourceManifest.merchant_fixture,
      strategy_revision: sourceManifest.strategy_revision,
      generator_version: sourceManifest.generator_version,
      target_theme: sourceManifest.target_theme,
      architecture_selection: sourceManifest.architecture_selection,
      source_artifact: {
        reference: fixture.generation_fixture.source_artifact_reference,
        manifest_reference: fixture.generation_fixture.source_artifact_manifest_reference,
        sha256: sourceSha256
      },
      controlled_resources: safeResourceSummary(fixture),
      materialization: {
        bound_count: changes.bound.length,
        omitted_count: changes.omitted.length,
        bound: changes.bound,
        omissions: changes.omitted
      },
      zip: {
        filename: path.basename(finalArchive),
        path: fixture.generation_fixture.artifact_reference,
        sha256: zip.sha256,
        compressed_bytes: zip.compressed_bytes,
        file_count: zip.file_count
      },
      shopify_operations: { write_operations: false, upload: false, publish: false, required_scope: 'none' }
    };
    writeJson(finalManifest, manifest);
    return { archive_path: finalArchive, manifest_path: finalManifest, manifest };
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

module.exports = {
  MATERIALIZER_VERSION,
  resourceRuntimeValue,
  materializeSettings,
  materializeTemplate,
  deterministicZip,
  materializeControlledArtifact
};
