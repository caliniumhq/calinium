#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { generateTheme } = require('./ai/theme-generator/generate-theme');
const { validateGeneratedWorkspace } = require('./ai/theme-generator/validate-generated-theme');
const { validateReadOnlyThemePackage } = require('./ai/theme-generator/validate-read-only-theme-package');
const { loadGeneratorMappings } = require('./ai/theme-generator/load-mappings');

const root = __dirname;

function usage() {
  return [
    'Usage:',
    '  node generate-theme.js generate --draft approved-draft.json --approval approval.json --run-id generation-run-0001 [--output-root output]',
    '  node generate-theme.js validate --workspace output/generation-run-0001',
    '  node generate-theme.js validate-package --workspace output/generation-run-0001',
    '  node generate-theme.js diff --workspace output/generation-run-0001',
    '  node generate-theme.js preview --workspace output/generation-run-0001',
    '  node generate-theme.js explain --workspace output/generation-run-0001',
    '',
    'The generator writes only into an isolated output/generation-run-* workspace. validate-package runs Shopify Theme Check against a generated read-only Calinium One package when one is present.'
  ].join('\n');
}

function args(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) { parsed._.push(value); continue; }
    const key = value.slice(2);
    parsed[key] = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : true;
  }
  return parsed;
}

function read(file, label) {
  if (!file || typeof file !== 'string') throw new Error(`${label} is required.`);
  return JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8'));
}

function workspace(value) {
  if (!value || typeof value !== 'string') throw new Error('--workspace is required.');
  const resolved = path.resolve(root, value);
  const allowed = path.resolve(root, 'output');
  const relative = path.relative(allowed, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Workspace must be inside output/.');
  return resolved;
}

function emit(value, pretty) {
  process.stdout.write(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
}

function main() {
  const parsed = args(process.argv.slice(2));
  const command = parsed._[0];
  if (!command || command === '--help' || parsed.help) { process.stdout.write(`${usage()}\n`); return; }
  const pretty = Boolean(parsed.pretty);
  if (command === 'generate') {
    const result = generateTheme({
      root,
      draft: read(parsed.draft, '--draft'),
      approval: read(parsed.approval, '--approval'),
      generationId: parsed['run-id'] || 'generation-run-0001',
      outputRoot: parsed['output-root'] ? path.resolve(root, parsed['output-root']) : path.join(root, 'output')
    });
    emit({ workspace: path.relative(root, result.workspace), validation: result.validation, source_theme_unchanged: result.source_theme_unchanged }, pretty);
    return;
  }
  const target = workspace(parsed.workspace);
  if (command === 'validate') {
    const validation = validateGeneratedWorkspace({ root, workspace: target, mappings: loadGeneratorMappings(root) });
    emit(validation, pretty);
    process.exitCode = validation.valid ? 0 : 1;
    return;
  }
  if (command === 'validate-package') {
    const validation = validateReadOnlyThemePackage({ root, workspace: target, runThemeCheck: true, writeReport: true });
    emit(validation, pretty);
    process.exitCode = validation.valid ? 0 : 1;
    return;
  }
  const report = command === 'diff' ? 'reports/theme-diff.json' : command === 'preview' ? 'reports/preview.md' : command === 'explain' ? 'manifests/generated-theme.json' : null;
  if (!report) throw new Error(`Unknown command ${command}.\n${usage()}`);
  const data = fs.readFileSync(path.join(target, report), 'utf8');
  if (command === 'preview') process.stdout.write(data);
  else if (command === 'explain') {
    const manifest = JSON.parse(data);
    emit({ generation_id: manifest.generation_id, approval: manifest.approval, generated_section_instances: manifest.generated_section_instances, generated_settings: manifest.generated_settings, merchant_references: manifest.merchant_references, unsupported_items: manifest.unsupported_items }, true);
  } else process.stdout.write(data);
}

try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
