#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildDraftConfiguration } = require('./ai/draft-builder/build-draft');
const { loadStrategy, DraftInputError } = require('./ai/draft-builder/load-strategy');
const { loadMappings } = require('./ai/draft-builder/load-mappings');
const { validateDraft } = require('./ai/draft-builder/validate-draft');
const { repositoryPaths } = require('./scripts/lib/repository-paths');

function usage() {
  return 'Usage: node build-draft-configuration.js [build|validate|explain|pretty] --profile merchant.json --strategy strategy.json [--output draft.json] [--stdout] [--pretty]\n       node build-draft-configuration.js validate --draft draft.json [--profile merchant.json --strategy strategy.json] [--stdout] [--pretty]';
}

function parseArguments(argumentList) {
  const args = [...argumentList];
  const command = !args[0]?.startsWith('--') ? args.shift() : 'build';
  const options = { command, pretty: command === 'pretty', stdout: false };
  while (args.length) {
    const argument = args.shift();
    if (argument === '--profile') options.profile = args.shift();
    else if (argument === '--strategy') options.strategy = args.shift();
    else if (argument === '--draft') options.draft = args.shift();
    else if (argument === '--output') options.output = args.shift();
    else if (argument === '--stdout') options.stdout = true;
    else if (argument === '--pretty') options.pretty = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Unknown argument ${argument}`);
  }
  return options;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'));
}

function writePayload(payload, options) {
  const text = JSON.stringify(payload, null, options.pretty ? 2 : 0);
  if (options.output) {
    const outputPath = path.resolve(process.cwd(), options.output);
    const paths = repositoryPaths(__dirname);
    const protectedRoots = [paths.themeRoot, paths.platformConfigRoot];
    if (protectedRoots.some((directory) => {
      const relativeOutput = path.relative(directory, outputPath);
      return relativeOutput === '' || (!relativeOutput.startsWith(`..${path.sep}`) && relativeOutput !== '..' && !path.isAbsolute(relativeOutput));
    })) throw new Error('Draft output must not be written into Shopify runtime or platform catalog directories.');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${text}\n`, 'utf8');
  }
  if (options.stdout || !options.output) process.stdout.write(`${text}\n`);
}

function requireInputs(options) {
  if (!options.profile || !options.strategy) throw new Error(usage());
  return { profile: readJson(options.profile), strategy: readJson(options.strategy) };
}

function run() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) { process.stdout.write(`${usage()}\n`); return; }
  if (!['build', 'validate', 'explain', 'pretty'].includes(options.command)) throw new Error(usage());
  if (options.command === 'validate' && options.draft) {
    const draft = readJson(options.draft);
    let strategy;
    if (options.profile || options.strategy) {
      const inputs = requireInputs(options);
      strategy = loadStrategy(inputs.profile, inputs.strategy).strategy;
    }
    const validation = validateDraft(draft, { mappings: loadMappings(), strategy });
    writePayload(validation, options);
    if (!validation.valid) process.exitCode = 1;
    return;
  }
  const inputs = requireInputs(options);
  const draft = buildDraftConfiguration(inputs.profile, inputs.strategy);
  if (options.command === 'validate') {
    writePayload(draft.validation_report, options);
    if (!draft.validation_report.valid) process.exitCode = 1;
    return;
  }
  writePayload(options.command === 'explain' ? draft.explanations : draft, options);
  if (!draft.validation_report.valid) process.exitCode = 1;
}

try {
  run();
} catch (error) {
  const payload = error instanceof DraftInputError ? error.validation : { valid: false, errors: [error.message], warnings: [] };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
}
