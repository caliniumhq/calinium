#!/usr/bin/env node
'use strict';

const path = require('path');
const {
  SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
  attestShopifyCliBuild,
  hardenShopifyCliRuntime
} = require('../ai/storefront-render/shopify-cli-build-attestation');

const root = path.resolve(__dirname, '..');
const verifyImmutable = process.argv.includes('--verify-immutable');
const harden = process.argv.includes('--harden');

try {
  const result = harden
    ? hardenShopifyCliRuntime({ root, env: process.env, command: process.env.CALINIUM_SHOPIFY_CLI })
    : attestShopifyCliBuild({
      root,
      env: process.env,
      command: process.env.CALINIUM_SHOPIFY_CLI,
      configureAutoUpgrade: !verifyImmutable,
      verifyImmutable
    });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    status: 'failed',
    contract_version: SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
    code: error?.code || 'shopify_cli_build_attestation_failed'
  })}\n`);
  process.exit(1);
}
