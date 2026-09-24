#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveComparisonRuns, evaluateComparison } = require('../ai/visual-evaluation/evaluate-comparison');

function parseArgs(argv) {
  const options = { replace: false, reviews: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--replace') options.replace = true;
    else if (argument === '--comparison-summary') options.comparisonSummary = argv[++index];
    else if (argument === '--output') options.outputDirectory = argv[++index];
    else if (argument === '--human-review') options.reviews.push(argv[++index]);
    else throw new Error(`Unknown visual-evaluation option ${argument}.`);
  }
  return options;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const options = parseArgs(process.argv.slice(2));
  const { currentRun, editorialRun } = resolveComparisonRuns(root, options.comparisonSummary);
  const reviews = options.reviews.map((reference) => JSON.parse(fs.readFileSync(path.resolve(root, reference), 'utf8')));
  const run = evaluateComparison({ root, currentRun, editorialRun, reviews, outputDirectory: options.outputDirectory, replace: options.replace });
  process.stdout.write(`Objective visual evaluation: ${run.summary.status}\n`);
  process.stdout.write(`Cells: ${run.summary.evaluated_cell_count}/16\n`);
  process.stdout.write(`Pass: ${run.summary.quality_gate_counts.pass}; pass with review: ${run.summary.quality_gate_counts.pass_with_review}; review required: ${run.summary.quality_gate_counts.fail_review_required}\n`);
  process.stdout.write(`Output: ${path.relative(root, run.destination)}\n`);
}

try { main(); }
catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
