#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createRenderRequest } = require('../ai/storefront-render/contracts');
const { captureStorefrontRender, writeJson } = require('../ai/storefront-render/capture-harness');
const { materializeControlledArtifact } = require('../ai/storefront-render/materialize-controlled-artifact');

const root = path.resolve(__dirname, '..');
const FIXTURE = 'fixtures/storefront-render-current-calinium.json';

function parseArgs(argv) {
  const options = { port: 9294, replace: false, executeDevelopmentRender: false, headless: true, requestOnly: false };
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
    else throw new Error(`Unknown current-Calinium baseline option ${argument}.`);
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) throw new Error('--port must be an integer from 1024 through 65535.');
  return options;
}

async function runBaseline(options = parseArgs(process.argv.slice(2))) {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, FIXTURE), 'utf8'));
  materializeControlledArtifact({ root, fixture });
  const request = createRenderRequest({ root, fixture });
  const outputDirectory = path.join(root, 'output', 'storefront-renders', request.request_id);
  if (options.requestOnly) {
    if (fs.existsSync(outputDirectory) && !options.replace) throw new Error(`Render Request output ${request.request_id} already exists.`);
    if (fs.existsSync(outputDirectory)) fs.rmSync(outputDirectory, { recursive: true, force: true });
    writeJson(path.join(outputDirectory, 'render-request.json'), request);
    return { request, output_directory: outputDirectory, manifest: null };
  }
  return captureStorefrontRender({
    root,
    request,
    outputDirectory,
    port: options.port,
    replace: options.replace,
    executeDevelopmentRender: options.executeDevelopmentRender,
    headless: options.headless
  });
}

async function main() {
  try {
    const result = await runBaseline();
    if (!result.manifest) {
      console.log(`Current Calinium Render Request created: ${path.relative(root, result.output_directory)}/render-request.json.`);
      return;
    }
    console.log(`Current Calinium baseline ${result.manifest.status}: request=${result.request.request_id}; captures=${result.manifest.passed_capture_count}/${result.manifest.expected_capture_count}; output=${path.relative(root, result.output_directory)}.`);
    if (result.manifest.status !== 'passed') process.exitCode = 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { FIXTURE, parseArgs, runBaseline };
