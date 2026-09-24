'use strict';

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { repositoryPaths, RUNTIME_DIRECTORIES, OPTIONAL_RUNTIME_DIRECTORIES } = require('../../scripts/lib/repository-paths');
const { runtimeInventory } = require('../../scripts/lib/theme-runtime-integrity');
const { writeJson } = require('./utils');
const { validateReadOnlyThemePackage } = require('./validate-read-only-theme-package');
const { applyArchitectureRuntime } = require('../architecture/apply-architecture-runtime');
const { withoutShopifyStorefrontPassword } = require('../storefront-render/shopify-storefront-password-binding');

function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true });
}

function copyBaseTheme({ root, themeRoot }) {
  const source = repositoryPaths(root).themeRoot;
  for (const directory of ['config', ...RUNTIME_DIRECTORIES, ...OPTIONAL_RUNTIME_DIRECTORIES.filter((item) => fs.existsSync(path.join(source, item)))]) {
    copyDirectory(path.join(source, directory), path.join(themeRoot, directory));
  }
}

function overlayGeneratedConfiguration({ generatedWorkspace, themeRoot }) {
  const source = path.join(generatedWorkspace, 'theme');
  const copied = [];
  const copy = (relative) => {
    const from = path.join(source, relative);
    const to = path.join(themeRoot, relative);
    if (!fs.existsSync(from)) return;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    copied.push(relative.split(path.sep).join('/'));
  };
  copy(path.join('config', 'settings_data.json'));
  const templates = path.join(source, 'templates');
  for (const entry of fs.readdirSync(templates, { withFileTypes: true })) if (entry.isFile() && entry.name.endsWith('.json')) copy(path.join('templates', entry.name));
  return copied.sort();
}

function listPackageFiles(themeRoot) {
  const files = [];
  const stack = [themeRoot];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile()) files.push(path.relative(themeRoot, absolute).split(path.sep).join('/'));
    }
  }
  return files.sort();
}

function createArchive({ root, workspace, themeRoot, generationId }) {
  const archiveDirectory = path.join(workspace, 'exports');
  const archivePath = path.join(archiveDirectory, `calinium-one-${generationId}.zip`);
  fs.mkdirSync(archiveDirectory, { recursive: true });
  const source = repositoryPaths(root).themeRoot;
  const directories = ['config', ...RUNTIME_DIRECTORIES, ...OPTIONAL_RUNTIME_DIRECTORIES.filter((item) => fs.existsSync(path.join(source, item)))];
  const childEnvironment = withoutShopifyStorefrontPassword(process.env);
  execFileSync('zip', ['-X', '-r', archivePath, ...directories], {
    cwd: themeRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: childEnvironment
  });
  const entries = execFileSync('unzip', ['-Z1', archivePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: childEnvironment
  }).split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  return { path: path.relative(workspace, archivePath).split(path.sep).join('/'), sha256: sha256File(archivePath), compressed_bytes: fs.statSync(archivePath).size, entries: entries.length };
}

function generateReadOnlyThemePackage({ root, generated, specification, runThemeCheck = true }) {
  const workspace = generated.workspace;
  const themeRoot = path.join(workspace, 'storefront-theme');
  if (fs.existsSync(themeRoot)) throw new Error(`Refusing to overwrite read-only theme package ${themeRoot}.`);
  const paths = repositoryPaths(root);
  const before = runtimeInventory(paths.themeRoot);
  copyBaseTheme({ root, themeRoot });
  const configurationFiles = overlayGeneratedConfiguration({ generatedWorkspace: workspace, themeRoot });
  const architectureRuntime = applyArchitectureRuntime({ root, themeRoot, architecture: generated.manifest.architecture_selection });
  const archive = createArchive({ root, workspace, themeRoot, generationId: generated.manifest.generation_id });
  const packageFiles = listPackageFiles(themeRoot).map((file) => `storefront-theme/${file}`);
  const manifest = {
    version: 1,
    generation_id: generated.manifest.generation_id,
    package_type: 'read_only_calinium_one_theme',
    theme_specification: 'manifests/theme-specification.json',
    base_theme: { id: 'calinium-one', source_checksum: before.checksum, source_file_count: before.file_count },
    architecture_runtime: architectureRuntime,
    workspace: 'storefront-theme',
    archive,
    generated_files: packageFiles,
    validation_report: 'reports/theme-package-validation.json',
    source_theme_modified: false,
    shopify_operations: { write_operations: false, upload: false, publish: false, required_scope: 'none' }
  };
  const validator = createSchemaValidator(root);
  const schemaErrors = validator.validateFile(manifest, 'schemas/calinium-read-only-theme-package.schema.json', 'read_only_theme_package');
  if (schemaErrors.length) throw new Error(`Read-only theme package manifest validation failed: ${schemaErrors.join('; ')}`);
  writeJson(path.join(workspace, 'manifests', 'theme-specification.json'), specification);
  writeJson(path.join(workspace, 'manifests', 'read-only-theme-package.json'), manifest);
  const after = runtimeInventory(paths.themeRoot);
  if (before.checksum !== after.checksum) throw new Error('Source Calinium One runtime changed while assembling the read-only theme package.');
  const validation = validateReadOnlyThemePackage({ root, workspace, runThemeCheck, writeReport: true });
  if (!validation.valid) {
    const error = new Error(`Read-only theme package validation failed: ${validation.errors.join(' ')}`);
    error.validation = validation;
    throw error;
  }
  return {
    workspace,
    theme_directory: themeRoot,
    archive_path: path.join(workspace, archive.path),
    manifest,
    specification,
    configuration_files: configurationFiles,
    architecture_runtime: architectureRuntime,
    validation,
    source_theme_unchanged: true
  };
}

module.exports = { generateReadOnlyThemePackage, copyBaseTheme, overlayGeneratedConfiguration, listPackageFiles, createArchive };
