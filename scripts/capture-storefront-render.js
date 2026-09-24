#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { assertRenderRequest } = require('../ai/storefront-render/contracts');
const { captureStorefrontRender } = require('../ai/storefront-render/capture-harness');

const root = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const options = { request: null, output: null, port: 9294, replace: false, executeDevelopmentRender: false, headless: true };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--request' || argument === '--output' || argument === '--port') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
      if (argument === '--request') options.request = value;
      if (argument === '--output') options.output = value;
      if (argument === '--port') options.port = Number(value);
      index += 1;
    } else if (argument === '--replace') options.replace = true;
    else if (argument === '--execute-development-render') options.executeDevelopmentRender = true;
    else if (argument === '--headed') options.headless = false;
    else throw new Error(`Unknown storefront render option ${argument}.`);
  }
  if (!options.request) throw new Error('--request is required.');
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) throw new Error('--port must be an integer from 1024 through 65535.');
  return options;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const requestPath = path.resolve(root, options.request);
    if (!fs.existsSync(requestPath)) throw new Error(`Render Request is unavailable: ${options.request}.`);
    const request = assertRenderRequest(JSON.parse(fs.readFileSync(requestPath, 'utf8')), root);
    const result = await captureStorefrontRender({
      root,
      request,
      outputDirectory: options.output ? path.resolve(root, options.output) : null,
      port: options.port,
      replace: options.replace,
      executeDevelopmentRender: options.executeDevelopmentRender,
      headless: options.headless
    });
    console.log(`Storefront render ${result.manifest.status}: request=${request.request_id}; captures=${result.manifest.passed_capture_count}/${result.manifest.expected_capture_count}; output=${path.relative(root, result.output_directory)}; source-unchanged=${result.manifest.source_theme_unchanged}; cleanup=${result.manifest.temporary_workspace_cleaned}.`);
    if (result.manifest.status !== 'passed') process.exitCode = 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { parseArgs, main };
