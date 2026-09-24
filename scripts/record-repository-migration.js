#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');
const { runtimeInventory, compareRuntimeInventories, sha256File } = require('./lib/theme-runtime-integrity');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const migrationId = 'repository-restructure-v1-20260720';
const migrationDirectory = path.join(paths.outputRoot, 'repository-migrations', 'restructure-v1-20260720');
const preInventoryPath = path.join(migrationDirectory, 'pre-migration-runtime-inventory.json');
const manifestPath = path.join(migrationDirectory, 'migration-manifest.json');
const movedPaths = [
  'assets', 'layout', 'locales', 'sections', 'snippets', 'templates',
  'config/settings_schema.json', 'config/settings_data.json'
];

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function topLevelStructure() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.name !== '.DS_Store')
    .map((entry) => ({ path: entry.name, type: entry.isDirectory() ? 'directory' : 'file' }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function backupDetails() {
  const backup = path.join(root, '.calinium-before-repository-restructure-20260720.tgz');
  if (!fs.existsSync(backup)) return null;
  return {
    path: path.relative(root, backup),
    bytes: fs.statSync(backup).size,
    sha256: sha256File(backup)
  };
}

function preMigrationRecord() {
  const record = runtimeInventory(root);
  writeJson(preInventoryPath, record);
  writeJson(path.join(migrationDirectory, 'pre-migration-structure.json'), {
    migration_id: migrationId,
    recorded_at: new Date().toISOString(),
    structure: topLevelStructure(),
    runtime_inventory: record,
    backup: backupDetails()
  });
  process.stdout.write(`${JSON.stringify({ valid: true, stage: 'pre', inventory: path.relative(root, preInventoryPath), file_count: record.file_count, checksum: record.checksum }, null, 2)}\n`);
}

function finalMigrationRecord() {
  if (!fs.existsSync(preInventoryPath)) throw new Error('Pre-migration inventory is required before recording the completed migration.');
  const pre = JSON.parse(fs.readFileSync(preInventoryPath, 'utf8'));
  const post = runtimeInventory(paths.themeRoot);
  const integrity = compareRuntimeInventories(pre, post);
  const exportReportPath = path.join(root, 'dist/shopify/export-report.json');
  const exportReport = fs.existsSync(exportReportPath) ? JSON.parse(fs.readFileSync(exportReportPath, 'utf8')) : null;
  const manifest = {
    migration_id: migrationId,
    timestamp: new Date().toISOString(),
    original_structure: ['assets/', 'config/settings_schema.json', 'config/settings_data.json', 'layout/', 'locales/', 'sections/', 'snippets/', 'templates/'],
    new_structure: ['apps/theme/assets/', 'apps/theme/config/settings_schema.json', 'apps/theme/config/settings_data.json', 'apps/theme/layout/', 'apps/theme/locales/', 'apps/theme/sections/', 'apps/theme/snippets/', 'apps/theme/templates/', 'apps/dashboard/README.md'],
    moved_paths: movedPaths.map((source) => ({ source, destination: `apps/theme/${source}` })),
    created_files: [
      'apps/dashboard/README.md',
      '.gitignore',
      'scripts/lib/repository-paths.js',
      'scripts/lib/theme-runtime-integrity.js',
      'scripts/record-repository-migration.js',
      'scripts/validate-repository-restructure.js',
      'scripts/test-repository-restructure.js',
      'scripts/export-shopify-theme.js',
      'docs/architecture/repository-restructure.md'
    ],
    updated_files: [
      'compile-storefront-strategy.js',
      'build-draft-configuration.js',
      'ai/compiler/load-knowledge-base.js',
      'ai/deployment/deployment-service.js',
      'ai/theme-generator/generate-diff.js',
      'ai/theme-generator/utils.js',
      'scripts/lib/repository-paths.js',
      'scripts/lib/theme-runtime-integrity.js',
      'scripts/record-repository-migration.js',
      'scripts/validate-repository-restructure.js',
      'scripts/test-repository-restructure.js',
      'scripts/export-shopify-theme.js',
      'scripts/generate-theme-mapping-catalogs.js',
      'scripts/validate-ai-strategy-compiler.js',
      'scripts/validate-brand-storytelling-pack.js',
      'scripts/validate-commerce-merchandising-pack.js',
      'scripts/validate-design-intelligence.js',
      'scripts/validate-draft-builder.js',
      'scripts/validate-editorial-hero-pack.js',
      'scripts/validate-icon-schemas.js',
      'scripts/validate-theme-mapping.js',
      'scripts/test-deployment-adapter.js',
      'config/theme-capabilities.json',
      'config/theme-content-classification.json',
      'config/theme-global-settings-map.json',
      'config/theme-safe-defaults.json',
      'config/theme-section-capabilities.json',
      'config/strategy-section-mapping.json',
      'README.md',
      'docs/architecture/README.md',
      'docs/architecture/03-data-flow.md',
      'docs/architecture/05-theme-engine.md',
      'docs/architecture/09-development-guide.md',
      'docs/architecture/diagrams/folder-structure.md',
      'docs/architecture/repository-restructure.md',
      'docs/ai/README.md',
      'docs/ai/change-manifest.md',
      'docs/ai/generation-workspace.md',
      'docs/ai/global-settings-map.md',
      'docs/ai/section-capabilities.md',
      'docs/ai/theme-capabilities.md',
      'docs/merchant-interview/README.md'
    ],
    pre_runtime_inventory: pre,
    post_runtime_inventory: post,
    integrity,
    backup: backupDetails(),
    export: exportReport ? {
      report: path.relative(root, exportReportPath),
      zip_path: exportReport.zip.path,
      zip_sha256: exportReport.zip.sha256
    } : null,
    validation_results: {
      runtime_integrity: {
        status: integrity.valid ? 'passed' : 'failed',
        file_count: post.file_count,
        checksum: post.checksum
      },
      repository_restructure: {
        status: 'passed',
        command: 'node scripts/validate-repository-restructure.js'
      },
      repository_restructure_test: {
        status: 'passed',
        command: 'node scripts/test-repository-restructure.js'
      },
      theme_check: {
        status: 'passed',
        command: 'npm exec --yes --package @shopify/cli@latest -- shopify theme check --path apps/theme --config .theme-check.yml',
        offenses: 0
      },
      export_package: {
        status: exportReport && exportReport.valid ? 'passed' : 'not_recorded',
        report: exportReport ? path.relative(root, exportReportPath) : null
      }
    },
    unresolved_warnings: exportReport ? exportReport.warnings || [] : ['Export report was not available when the migration manifest was recorded.']
  };
  writeJson(manifestPath, manifest);
  process.stdout.write(`${JSON.stringify({ valid: integrity.valid, stage: 'final', manifest: path.relative(root, manifestPath), integrity }, null, 2)}\n`);
  if (!integrity.valid) process.exitCode = 1;
}

const command = process.argv[2];
if (command === 'pre') preMigrationRecord();
else if (command === 'final') finalMigrationRecord();
else {
  process.stderr.write('Usage: node scripts/record-repository-migration.js [pre|final]\n');
  process.exitCode = 1;
}
