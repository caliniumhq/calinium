#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { generateStorefront } = require('./generate-storefront');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function argument(args, name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; }

function usage() {
  return [
    'Usage:',
    '  npm run generate-storefront -- --brief <creative-brief.json> --strategy <store-strategy.json> --review <review.json> [--generation <generation-context.json> --run-id generation-run-example]',
    '',
    'The command does not deploy or publish. Without an approved generation context it produces a validated Draft and reports the merchant input still required.'
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { process.stdout.write(`${usage()}\n`); return; }
  const brief = argument(args, '--brief');
  const strategy = argument(args, '--strategy');
  const review = argument(args, '--review');
  if (!brief || !strategy || !review) throw new Error(usage());
  const root = path.resolve(__dirname, '..');
  const generationFile = argument(args, '--generation');
  const result = generateStorefront({
    root,
    creativeBrief: readJson(path.resolve(brief)),
    storeStrategy: readJson(path.resolve(strategy)),
    review: readJson(path.resolve(review)),
    generation: generationFile ? readJson(path.resolve(generationFile)) : {},
    generationId: argument(args, '--run-id'),
    outputRoot: path.join(root, 'output')
  });
  const output = {
    status: result.status,
    merchant_profile: result.merchant_profile.profile_id,
    draft_readiness: result.draft.draft_readiness,
    preview_package: result.preview_package?.directory || null,
    next_step: result.status === 'generated_for_review' ? 'Review the generated configuration through the existing Review Session Engine.' : result.next_step
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
