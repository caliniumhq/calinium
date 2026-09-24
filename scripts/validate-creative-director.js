#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');

const root = path.resolve(__dirname, '..');
const validator = createSchemaValidator(root);
const schemas = ['merchant-input.schema.json', 'conversation-state.schema.json', 'creative-brief.schema.json', 'store-strategy.schema.json', 'creative-director-review.schema.json'];
const fixtures = ['leather-travel-bags.json', 'handmade-rugs.json', 'skincare-brand.json'];
const documentation = ['README.md', 'docs/architecture/current-system-audit.md', 'docs/architecture/ai-creative-director.md', 'docs/architecture/repository-structure.md', 'docs/guides/creative-director-cli.md', 'docs/schemas/creative-brief.md', 'docs/schemas/store-strategy.md'];
const errors = [];

schemas.forEach((file) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, 'schemas', file), 'utf8'));
    if (!parsed.$id || !parsed.version && !parsed.properties?.version) errors.push(`schemas/${file} is missing its versioned contract metadata.`);
  } catch (error) { errors.push(`schemas/${file} does not parse: ${error.message}`); }
});

fixtures.forEach((file) => {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures', file), 'utf8'));
  errors.push(...validator.validateFile(fixture, 'schemas/merchant-input.schema.json', `fixtures/${file}`));
  try {
    const brief = createCreativeBrief({ merchantInput: fixture, root });
    const strategy = createStoreStrategy({ creativeBrief: brief, root });
    errors.push(...validator.validateFile(brief, 'schemas/creative-brief.schema.json', `${file} creative brief`));
    errors.push(...validator.validateFile(strategy, 'schemas/store-strategy.schema.json', `${file} store strategy`));
  } catch (error) { errors.push(`${file} pipeline failed: ${error.message}${error.errors ? ` (${error.errors.join('; ')})` : ''}`); }
});

const requiredFiles = [
  'ai/conversation/conversation-engine.js', 'ai/understanding/extract-business-understanding.js', 'ai/creative-brief/create-creative-brief.js',
  'ai/store-strategy/create-store-strategy.js', 'pipeline/creative-director-cli.js', 'product/merchant-journey.md', 'docs/architecture/current-system-audit.md'
];
requiredFiles.forEach((file) => { if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required Creative Director file: ${file}`); });
if (fs.existsSync(path.join(root, 'product:'))) errors.push('Legacy product: directory remains after the controlled product-document migration.');

documentation.forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const links = [...source.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1].split('#')[0]).filter((target) => target && !/^(https?:|mailto:)/.test(target));
  links.forEach((target) => {
    const resolved = path.resolve(path.dirname(path.join(root, file)), target);
    if (!fs.existsSync(resolved)) errors.push(`${file} has a broken local Markdown link: ${target}`);
  });
});

if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else process.stdout.write('Creative Director schemas, fixtures, and module boundaries validate.\n');
