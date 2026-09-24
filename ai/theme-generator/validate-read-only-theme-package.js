'use strict';

const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { repositoryPaths, RUNTIME_DIRECTORIES, OPTIONAL_RUNTIME_DIRECTORIES, THEME_CONFIGURATION_FILES } = require('../../scripts/lib/repository-paths');
const { runtimeInventory } = require('../../scripts/lib/theme-runtime-integrity');
const { validateHomepageBootstrap } = require('../../scripts/lib/homepage-bootstrap');
const { readJson, writeJson } = require('./utils');
const { resolveArchitectureRuntime } = require('../architecture/apply-architecture-runtime');
const { withoutShopifyStorefrontPassword } = require('../storefront-render/shopify-storefront-password-binding');

const MAX_COMPRESSED_BYTES = 50 * 1000 * 1000;

function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

function walk(directory, prefix = '') {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const relative = path.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute, relative));
    else if (entry.isFile()) files.push(relative.split(path.sep).join('/'));
  }
  return files;
}

function liquidFiles(directory) { return walk(directory).filter((file) => file.endsWith('.liquid')); }

function containsPrivateRuntimeReference(value) {
  if (typeof value === 'string') return value.startsWith('dashboard://projects/');
  if (Array.isArray(value)) return value.some(containsPrivateRuntimeReference);
  if (value && typeof value === 'object') return Object.values(value).some(containsPrivateRuntimeReference);
  return false;
}

function validateJson(themeRoot, errors) {
  for (const file of walk(themeRoot).filter((entry) => entry.endsWith('.json'))) {
    try {
      const value = JSON.parse(fs.readFileSync(path.join(themeRoot, file), 'utf8'));
      if (containsPrivateRuntimeReference(value)) errors.push(`Generated storefront-theme/${file} contains a private dashboard resource reference.`);
    }
    catch (error) { errors.push(`Invalid JSON in storefront-theme/${file}: ${error.message}`); }
  }
}

function overlayMap(runtimeApplication) {
  return new Map((runtimeApplication?.overlays || []).map((overlay) => [overlay.target, overlay]));
}

function validateLiquidPreservation({ sourceRoot, themeRoot, errors, architectureRuntime = null }) {
  const source = liquidFiles(sourceRoot);
  const copied = liquidFiles(themeRoot);
  const copiedSet = new Set(copied);
  const overlays = overlayMap(architectureRuntime);
  for (const file of source) {
    if (!copiedSet.has(file)) errors.push(`Generated theme is missing Calinium One Liquid file ${file}.`);
    else {
      const expected = overlays.get(file)?.sha256 || sha256File(path.join(sourceRoot, file));
      if (expected !== sha256File(path.join(themeRoot, file))) errors.push(`Generated theme Liquid file ${file} does not match its registered architecture presenter.`);
    }
  }
  for (const file of copied) if (!source.includes(file) && !overlays.has(file)) errors.push(`Generated theme introduced unregistered Liquid file ${file}.`);
  return { checked: source.length, valid: errors.length === 0 };
}

function validateAccessibility(themeRoot, errors) {
  const layout = path.join(themeRoot, 'layout', 'theme.liquid');
  const source = fs.existsSync(layout) ? fs.readFileSync(layout, 'utf8') : '';
  const requirements = [
    ['document language', /<html\s+lang=/i],
    ['responsive viewport', /name=["']viewport["']/i],
    ['skip link', /href=["']#MainContent["']/i],
    ['main landmark', /<main\s+id=["']MainContent["']/i],
    ['live status region', /aria-live=["']polite["']/i]
  ];
  const failures = [];
  for (const [name, pattern] of requirements) if (!pattern.test(source)) failures.push(name);
  if (failures.length) errors.push(`Generated theme accessibility baseline is missing: ${failures.join(', ')}.`);
  return { checked: requirements.map(([name]) => name), failures, valid: failures.length === 0 };
}

function archiveEntries(archivePath) {
  return execFileSync('unzip', ['-Z1', archivePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: withoutShopifyStorefrontPassword(process.env)
  })
    .split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
}

function validateArchive({ archivePath, errors }) {
  if (!fs.existsSync(archivePath)) {
    errors.push('Generated theme archive is missing.');
    return { valid: false, entry_count: 0, compressed_bytes: 0 };
  }
  const allowed = new Set(['config', ...RUNTIME_DIRECTORIES, ...OPTIONAL_RUNTIME_DIRECTORIES]);
  let entries = [];
  try { entries = archiveEntries(archivePath); }
  catch (error) { errors.push(`Generated theme archive could not be read: ${error.message}`); }
  for (const entry of entries) {
    const top = entry.split('/')[0];
    if (!allowed.has(top)) errors.push(`Generated theme archive has forbidden entry ${entry}.`);
    if (entry.includes('.DS_Store') || entry.split('/').some((part) => part.startsWith('.'))) errors.push(`Generated theme archive has hidden/system entry ${entry}.`);
  }
  for (const required of ['assets/', 'config/', 'layout/', 'locales/', 'sections/', 'snippets/', 'templates/', 'layout/theme.liquid', 'config/settings_schema.json']) {
    if (!entries.includes(required)) errors.push(`Generated theme archive is missing ${required}.`);
  }
  const compressedBytes = fs.statSync(archivePath).size;
  if (compressedBytes > MAX_COMPRESSED_BYTES) errors.push(`Generated theme archive exceeds Shopify's 50 MB compressed limit.`);
  return { valid: errors.length === 0, entry_count: entries.length, compressed_bytes: compressedBytes };
}

function runThemeCheck({ root, themeRoot }) {
  // Use the locally installed Shopify CLI. Downloading a transient CLI here can
  // select a different version than the one used for the project and makes a
  // read-only validation depend on network/package-registry availability.
  const shopifyCli = process.env.CALINIUM_SHOPIFY_CLI || 'shopify';
  const result = spawnSync(shopifyCli, ['theme', 'check', '--path', themeRoot, '--config', path.join(root, '.theme-check.yml')], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    env: { ...withoutShopifyStorefrontPassword(process.env), CI: '1' }
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  return {
    status: result.error ? 'unavailable' : result.status === 0 ? 'passed' : 'failed',
    exit_code: result.status === null || result.status === undefined ? null : result.status,
    warnings: (output.match(/\[warning\]/g) || []).length,
    output: output.slice(0, 12000)
  };
}

function validateInternalConsistency({ root, workspace, themeRoot, specification, manifest, errors }) {
  const sourcePaths = repositoryPaths(root);
  const packageInventory = runtimeInventory(themeRoot);
  const sourceRuntime = runtimeInventory(sourcePaths.themeRoot);
  const sourceFiles = new Map(sourceRuntime.files.map((file) => [file.path, file]));
  const packageFiles = new Map(packageInventory.files.map((file) => [file.path, file]));
  const overlays = overlayMap(manifest.architecture_runtime);
  if (!manifest.architecture_runtime && specification.architecture?.profile_id !== 'profile.current_calinium.v1') {
    errors.push('Non-default architecture package is missing architecture runtime provenance.');
  }
  if (manifest.architecture_runtime) {
    let expectedRuntime = null;
    try { expectedRuntime = resolveArchitectureRuntime({ root, architecture: specification.architecture }); }
    catch (error) { errors.push(`Architecture runtime provenance could not be resolved: ${error.message}`); }
    if (expectedRuntime && JSON.stringify(expectedRuntime) !== JSON.stringify(manifest.architecture_runtime)) errors.push('Package architecture runtime provenance does not match the registered frozen selection.');
  }
  if (manifest.base_theme.source_file_count !== sourceRuntime.file_count) errors.push('Package manifest source file count does not match Calinium One.');
  for (const [file, sourceFile] of sourceFiles) {
    const packaged = packageFiles.get(file);
    if (!packaged) errors.push(`Generated theme package removed Calinium One file ${file}.`);
    else if (!/^templates\/.+\.json$/.test(file) && file !== 'config/settings_data.json') {
      const expectedSha = overlays.get(file)?.sha256 || sourceFile.sha256;
      if (expectedSha !== packaged.sha256) errors.push(`Generated theme package file ${file} does not match its registered architecture source.`);
    }
  }
  for (const [file, packaged] of packageFiles) {
    if (!sourceFiles.has(file) && !/^templates\/.+\.json$/.test(file)) {
      const overlay = overlays.get(file);
      if (!overlay) errors.push(`Generated theme package added unregistered runtime file ${file}.`);
      else if (overlay.sha256 !== packaged.sha256) errors.push(`Generated architecture runtime file ${file} failed integrity verification.`);
    }
  }
  for (const [file, overlay] of overlays) {
    if (!packageFiles.has(file)) errors.push(`Generated theme package is missing registered architecture runtime file ${file}.`);
    else if (packageFiles.get(file).sha256 !== overlay.sha256) errors.push(`Generated architecture runtime file ${file} failed integrity verification.`);
    const sourcePath = path.resolve(root, overlay.source);
    if (!fs.existsSync(sourcePath) || sha256File(sourcePath) !== overlay.sha256) errors.push(`Registered architecture source ${overlay.source} does not match package provenance.`);
  }
  if (manifest.source_theme_modified !== false || manifest.shopify_operations?.write_operations || manifest.shopify_operations?.upload || manifest.shopify_operations?.publish || manifest.shopify_operations?.required_scope !== 'none') errors.push('Generated package does not preserve the read-only Shopify boundary.');
  const index = readJson(path.join(themeRoot, 'templates', 'index.json'));
  const specificationOrder = specification.section_ordering.map((section) => section.instance_id);
  if (JSON.stringify(index.order) !== JSON.stringify(specificationOrder)) errors.push('Generated homepage order does not exactly match the Theme Specification.');
  for (const section of specification.section_ordering) if (index.sections?.[section.instance_id]?.type !== section.section_id) errors.push(`Theme Specification section ${section.instance_id} does not match generated homepage configuration.`);
  if (sourceRuntime.checksum !== manifest.base_theme.source_checksum) errors.push('Calinium One source runtime changed after this package was generated.');
  if (specification.base_theme.runtime_checksum !== manifest.base_theme.source_checksum) errors.push('Theme Specification base checksum does not match the package manifest.');
  if (path.basename(workspace) !== manifest.generation_id) errors.push('Package workspace does not match its generation ID.');
}

function validateReadOnlyThemePackage({ root, workspace, runThemeCheck: shouldRunThemeCheck = false, writeReport = true }) {
  const errors = [];
  const warnings = [];
  const themeRoot = path.join(workspace, 'storefront-theme');
  const manifestPath = path.join(workspace, 'manifests', 'read-only-theme-package.json');
  const specificationPath = path.join(workspace, 'manifests', 'theme-specification.json');
  let manifest = null;
  let specification = null;
  try { manifest = readJson(manifestPath); } catch (error) { errors.push(`Could not read package manifest: ${error.message}`); }
  try { specification = readJson(specificationPath); } catch (error) { errors.push(`Could not read Theme Specification: ${error.message}`); }
  const validator = createSchemaValidator(root);
  if (manifest) errors.push(...validator.validateFile(manifest, 'schemas/calinium-read-only-theme-package.schema.json', 'read_only_theme_package'));
  if (specification) errors.push(...validator.validateFile(specification, 'schemas/calinium-theme-specification.schema.json', 'theme_specification'));
  const allowedDirectories = new Set(['config', ...RUNTIME_DIRECTORIES, ...OPTIONAL_RUNTIME_DIRECTORIES]);
  if (!fs.existsSync(themeRoot)) errors.push('Generated storefront-theme directory is missing.');
  else {
    for (const entry of fs.readdirSync(themeRoot, { withFileTypes: true })) if (!entry.isDirectory() || !allowedDirectories.has(entry.name)) errors.push(`Generated storefront-theme contains forbidden top-level entry ${entry.name}.`);
    for (const directory of RUNTIME_DIRECTORIES) if (!fs.existsSync(path.join(themeRoot, directory))) errors.push(`Generated storefront-theme is missing ${directory}/.`);
    for (const file of THEME_CONFIGURATION_FILES) if (!fs.existsSync(path.join(themeRoot, file))) errors.push(`Generated storefront-theme is missing ${file}.`);
    validateJson(themeRoot, errors);
  }
  const liquid = fs.existsSync(themeRoot) ? validateLiquidPreservation({ sourceRoot: repositoryPaths(root).themeRoot, themeRoot, errors, architectureRuntime: manifest?.architecture_runtime || null }) : { checked: 0, valid: false };
  const accessibility = fs.existsSync(themeRoot) ? validateAccessibility(themeRoot, errors) : { checked: [], failures: ['theme missing'], valid: false };
  const homepageBootstrap = fs.existsSync(themeRoot) ? validateHomepageBootstrap({
    themeRoot,
    requiredSectionTypes: specification?.section_ordering?.map((section) => section.section_id) || []
  }) : { valid: false, errors: ['Generated storefront-theme is missing.'], section_ids: [], section_types: [] };
  errors.push(...homepageBootstrap.errors);
  const archive = manifest ? validateArchive({ archivePath: path.join(workspace, manifest.archive?.path || ''), errors }) : { valid: false, entry_count: 0, compressed_bytes: 0 };
  if (manifest && specification && fs.existsSync(themeRoot)) validateInternalConsistency({ root, workspace, themeRoot, specification, manifest, errors });
  const themeCheck = shouldRunThemeCheck && fs.existsSync(themeRoot) ? runThemeCheck({ root, themeRoot }) : { status: 'not_run', exit_code: null, warnings: 0, output: 'Run node generate-theme.js validate-package --workspace <workspace> to execute Shopify Theme Check.' };
  if (themeCheck.status !== 'passed' && themeCheck.status !== 'not_run') errors.push(`Shopify Theme Check ${themeCheck.status}.`);
  if (themeCheck.status === 'not_run') warnings.push('Shopify Theme Check has not run for this isolated package.');
  const report = {
    version: 1,
    generation_id: manifest?.generation_id || null,
    valid: errors.length === 0,
    errors,
    warnings,
    checks: {
      liquid,
      json: { valid: !errors.some((message) => message.startsWith('Invalid JSON')), files_checked: fs.existsSync(themeRoot) ? walk(themeRoot).filter((file) => file.endsWith('.json')).length : 0 },
      accessibility,
      homepage_bootstrap: homepageBootstrap,
      internal_consistency: { valid: !errors.some((message) => /Theme Specification|homepage order|read-only Shopify boundary|base checksum|runtime file count|source runtime|workspace|architecture runtime|architecture source|registered runtime|registered architecture/.test(message)) },
      archive,
      theme_check: themeCheck
    },
    source_theme_modified: false
  };
  if (writeReport) writeJson(path.join(workspace, 'reports', 'theme-package-validation.json'), report);
  return report;
}

module.exports = { validateReadOnlyThemePackage, runThemeCheck, validateAccessibility, validateLiquidPreservation, validateArchive, containsPrivateRuntimeReference, walk, MAX_COMPRESSED_BYTES };
