#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { inspectLifecycleRules, TIGRIS_ENDPOINT, TIGRIS_REGION } = require('../apps/dashboard/server/assets/tigris-object-storage-adapter.cjs');
const { ACCEPTANCE_VERSION, ACCEPTANCE_REVISION } = require('../apps/dashboard/server/assets/durable-storage-provider-acceptance.cjs');

assert.equal(TIGRIS_ENDPOINT, 'https://t3.storage.dev');
assert.equal(TIGRIS_REGION, 'auto');
assert.equal(ACCEPTANCE_VERSION, 'calinium-durable-storage-provider-acceptance-v1');
assert.equal(ACCEPTANCE_REVISION, 'tigris-real-io-restore-v1');
assert.equal(inspectLifecycleRules([], 'public/organizations/').authoritative_retention_safe, true);
assert.equal(inspectLifecycleRules([{ Status: 'Enabled', Prefix: 'public/', Expiration: { Days: 30 } }], 'public/organizations/').authoritative_retention_safe, false);
for (const file of [
  'apps/dashboard/server/assets/tigris-object-storage-adapter.cjs',
  'apps/dashboard/server/assets/durable-storage-provider-acceptance.cjs',
  'schemas/calinium-durable-storage-provider-acceptance.schema.json',
  'docs/launch/calinium-public-durable-storage-provider-decision.md',
  'docs/launch/calinium-public-durable-storage-provider-operations.md'
]) assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
process.stdout.write('Public durable-storage provider acceptance source validation passed.\n');
