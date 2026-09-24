'use strict';

const path = require('path');
const { executeDeterministicProcess } = require('../storefront-render/shopify-cli-runtime');

function resolveShopifyAuth(options = {}) {
  const store = options.store || process.env.SHOPIFY_FLAG_STORE || process.env.SHOPIFY_STORE_DOMAIN;
  if (!store || typeof store !== 'string') throw new Error('A Shopify development-store domain is required through --store or SHOPIFY_FLAG_STORE.');
  const token = options.token || process.env.SHOPIFY_CLI_THEME_TOKEN || null;
  return { store, mode: token ? 'theme_access_token' : 'shopify_cli_session', environment: options.environment || null, has_token: Boolean(token), token };
}

function defaultRunner(command, args, options = {}) {
  const env = options.env || process.env;
  const executable = command === 'shopify'
    ? env.CALINIUM_SHOPIFY_CLI || path.join(options.root || options.cwd || process.cwd(), 'node_modules', '.bin', 'shopify')
    : command;
  return executeDeterministicProcess({ command: executable, args, cwd: options.cwd, env, timeoutMs: options.timeoutMs });
}

function cliOptions(auth) {
  const values = ['--store', auth.store];
  if (auth.environment) values.push('--environment', auth.environment);
  return values;
}

function runnerOptions(auth, cwd, root = cwd) {
  // Keep a token in process memory only long enough to invoke Shopify CLI. It is
  // deliberately omitted from every report, manifest, record, and CLI output.
  const env = auth.token ? { ...process.env, SHOPIFY_CLI_THEME_TOKEN: auth.token } : process.env;
  return { cwd, root, env };
}

module.exports = { resolveShopifyAuth, defaultRunner, cliOptions, runnerOptions };
