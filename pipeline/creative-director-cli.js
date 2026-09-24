#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');
const { startConversation, respond, formatUnderstanding, applyMerchantCorrection, materializeMerchantInput } = require('../ai/conversation');
const { createCreativeBrief, createStoreStrategy, createReviewState, setCreativeBriefStatus, validateReviewState } = require('.');
const { repositoryPaths } = require('../scripts/lib/repository-paths');

function parseArguments(argumentsList) {
  const options = { fixture: null, outputId: null, pretty: true };
  const args = [...argumentsList];
  while (args.length) {
    const argument = args.shift();
    if (argument === '--fixture') options.fixture = args.shift();
    else if (argument === '--output-id') options.outputId = args.shift();
    else if (argument === '--compact') options.pretty = false;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Unknown argument ${argument}`);
  }
  return options;
}

function usage() {
  return 'Usage: npm run creative-director -- [--fixture fixtures/leather-travel-bags.json] [--output-id name] [--compact]';
}

function slug(value) {
  return String(value || 'creative-director-session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'creative-director-session';
}

function writeJson(file, payload, pretty) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(payload, null, pretty ? 2 : 0)}\n`, 'utf8');
}

function createTerminal() {
  const terminal = readline.createInterface({ input, output });
  const queuedAnswers = [];
  let resolveAnswer = null;
  terminal.on('line', (line) => {
    if (resolveAnswer) {
      const resolve = resolveAnswer;
      resolveAnswer = null;
      resolve(line);
    } else queuedAnswers.push(line);
  });
  return {
    ask(prompt) {
      output.write(prompt);
      if (queuedAnswers.length) return Promise.resolve(queuedAnswers.shift());
      return new Promise((resolve) => { resolveAnswer = resolve; });
    },
    close() { terminal.close(); }
  };
}

function saveResults({ creativeBrief, storeStrategy, review, outputId, pretty }) {
  const paths = repositoryPaths(path.resolve(__dirname, '..'));
  const id = slug(outputId || creativeBrief.business.name);
  const creativeBriefPath = path.join(paths.outputRoot, 'creative-brief', `${id}.json`);
  const storeStrategyPath = path.join(paths.outputRoot, 'store-strategy', `${id}.json`);
  const reviewPath = path.join(paths.outputRoot, 'creative-director-review', `${id}.json`);
  writeJson(creativeBriefPath, creativeBrief, pretty);
  writeJson(storeStrategyPath, storeStrategy, pretty);
  writeJson(reviewPath, review, pretty);
  return { creativeBriefPath, storeStrategyPath, reviewPath };
}

async function interactiveMerchantInput() {
  const session = startConversation({ conversationId: 'creative-director-cli' });
  const terminal = createTerminal();
  let state = session.state;
  output.write(`${session.message}\n`);
  while (state.currentQuestionId) {
    const answer = await terminal.ask('> ');
    if (answer.startsWith('/correct ')) {
      const [, expression] = answer.split('/correct ');
      const [field, ...value] = expression.split('=');
      state = applyMerchantCorrection(state, field.trim(), value.join('=').trim());
      output.write(`${formatUnderstanding(state)}\n`);
      continue;
    }
    const result = await respond({ state, message: answer });
    state = result.state;
    output.write(`${result.message}\n`);
  }
  if (!state.readyForCreativeBrief) {
    terminal.close();
    throw new Error('Calinium needs the offer, audience, and primary goal before it can create a useful Creative Brief.');
  }
  while (true) {
    const answer = await terminal.ask('Type yes to confirm this understanding, or use /correct field=value: ');
    if (/^yes$/i.test(answer.trim())) {
      terminal.close();
      return { merchantInput: materializeMerchantInput(state), conversationState: state, confirmed: true };
    }
    if (answer.startsWith('/correct ')) {
      const [, expression] = answer.split('/correct ');
      const [field, ...value] = expression.split('=');
      if (field && value.length) {
        state = applyMerchantCorrection(state, field.trim(), value.join('=').trim());
        output.write(`${formatUnderstanding(state)}\n`);
        continue;
      }
    }
    output.write('No change was made. Type yes to confirm, or use /correct field=value to revise what Calinium understood.\n');
  }
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) { output.write(`${usage()}\n`); return; }
  let merchantInput;
  let conversationState;
  let confirmed = false;
  if (options.fixture) {
    merchantInput = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), options.fixture), 'utf8'));
    ({ state: conversationState } = startConversation({ merchantInput, conversationId: `fixture-${slug(options.fixture)}` }));
    confirmed = true;
    output.write(`${formatUnderstanding(conversationState)}\n`);
  } else ({ merchantInput, conversationState, confirmed } = await interactiveMerchantInput());

  const creativeBrief = createCreativeBrief({ merchantInput, conversationState });
  let review = createReviewState();
  if (confirmed) review = setCreativeBriefStatus(review, 'approved');
  const storeStrategy = createStoreStrategy({ creativeBrief });
  const reviewValidation = validateReviewState(review);
  if (!reviewValidation.valid) throw new Error(reviewValidation.errors.join('; '));
  const written = saveResults({ creativeBrief, storeStrategy, review, outputId: options.outputId || path.basename(options.fixture || 'creative-director-session', '.json'), pretty: options.pretty });
  output.write(`\nCreative Brief saved to ${path.relative(process.cwd(), written.creativeBriefPath)}\n`);
  output.write(`Store Strategy saved to ${path.relative(process.cwd(), written.storeStrategyPath)}\n`);
  output.write(`Review state saved to ${path.relative(process.cwd(), written.reviewPath)}\n`);
  output.write('The Store Strategy is a recommendation for merchant review. It does not generate or modify a Shopify theme.\n');
}

run().catch((error) => {
  process.stderr.write(`${error.name || 'Error'}: ${error.message}\n`);
  if (error.errors) process.stderr.write(`${error.errors.join('\n')}\n`);
  process.exitCode = 1;
});
