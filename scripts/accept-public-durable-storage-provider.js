#!/usr/bin/env node
'use strict';

const path = require('path');
const { createAuthoritativeStorageProvider } = require('../apps/dashboard/server/assets/create-storage-provider.cjs');
const { DurableStorageProviderAcceptance, capabilityFromAcceptance } = require('../apps/dashboard/server/assets/durable-storage-provider-acceptance.cjs');

async function main() {
  const root = path.resolve(__dirname, '..');
  const provider = createAuthoritativeStorageProvider({ root, env: process.env });
  const acceptance = new DurableStorageProviderAcceptance({ provider });
  const report = await acceptance.run({ force: true });
  process.stdout.write(`${JSON.stringify({ report, capability: capabilityFromAcceptance(report) }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: 'NOT_READY',
    code: error?.code || 'storage_provider_acceptance_failed',
    provider_code: error?.provider_code || null,
    provider_http_status: error?.provider_http_status || null
  })}\n`);
  process.exitCode = 1;
});
