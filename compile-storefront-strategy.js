#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { compileStorefrontStrategy, validateProfile, ProfileValidationError } = require('./ai/compiler/compile-strategy');
const { createStoreStrategy } = require('./pipeline/create-store-strategy');
const { repositoryPaths } = require('./scripts/lib/repository-paths');

function usage() {
  return 'Usage: node compile-storefront-strategy.js [compile|validate|explain] --input merchant-profile.json [--output strategy.json] [--pretty] [--stdout]\n       node compile-storefront-strategy.js creative-director --input creative-brief.json [--output store-strategy.json] [--pretty] [--stdout]';
}

function parseArguments(argumentsList) {
  const args = [...argumentsList];
  const command = !args[0]?.startsWith('--') ? args.shift() : 'compile';
  const options = { command, pretty: false, stdout: false };
  while (args.length) {
    const argument = args.shift();
    if (argument === '--input') options.input = args.shift();
    else if (argument === '--output') options.output = args.shift();
    else if (argument === '--pretty') options.pretty = true;
    else if (argument === '--stdout') options.stdout = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Unknown argument ${argument}`);
  }
  return options;
}

function writePayload(payload, options) {
  const text = JSON.stringify(payload, null, options.pretty ? 2 : 0);
  if (options.output) {
    const outputPath = path.resolve(process.cwd(), options.output);
    const paths = repositoryPaths(__dirname);
    const protectedRoots = [paths.themeRoot, paths.platformConfigRoot];
    const protectedDirectory = protectedRoots.some((directory) => {
      const relativeOutput = path.relative(directory, outputPath);
      return relativeOutput === '' || (!relativeOutput.startsWith(`..${path.sep}`) && relativeOutput !== '..' && !path.isAbsolute(relativeOutput));
    });
    if (protectedDirectory) throw new Error('Strategy output must not be written into Shopify runtime or platform catalog directories.');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${text}\n`, 'utf8');
  }
  if (options.stdout || !options.output) process.stdout.write(`${text}\n`);
}

function run() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) { process.stdout.write(`${usage()}\n`); return; }
  if (!['compile', 'validate', 'explain', 'creative-director'].includes(options.command) || !options.input) throw new Error(usage());
  const profile = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), options.input), 'utf8'));
  if (options.command === 'creative-director') {
    const strategy = createStoreStrategy({ creativeBrief: profile });
    writePayload(strategy, options);
    return;
  }
  if (options.command === 'validate') {
    const validation = validateProfile(profile);
    writePayload(validation, options);
    if (!validation.valid) process.exitCode = 1;
    return;
  }
  const strategy = compileStorefrontStrategy(profile);
  writePayload(options.command === 'explain' ? strategy.explanations : strategy, options);
  if (!strategy.validation_report.valid) process.exitCode = 1;
}

try {
  run();
} catch (error) {
  const payload = error instanceof ProfileValidationError ? error.validation : { valid: false, errors: [error.message], warnings: [] };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
}
