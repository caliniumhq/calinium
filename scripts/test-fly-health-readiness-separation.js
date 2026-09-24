#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { createDashboardApiHandler } = require('../apps/dashboard/server/dashboard-api.cjs');
const { DashboardError } = require('../apps/dashboard/server/lib/errors.cjs');

const root = path.resolve(__dirname, '..');
const tests = [];
function test(name, run) { tests.push({ name, run }); }

async function invoke(api, url) {
  const request = Readable.from([]);
  Object.assign(request, {
    method: 'GET',
    url,
    headers: { host: 'dashboard.test' },
    socket: { remoteAddress: '127.0.0.1' }
  });
  const response = {
    status: null,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    writeHead(status, headers) { this.status = status; this.headers = { ...this.headers, ...(headers || {}) }; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, payload: JSON.parse(response.body) };
}

function invalidReadiness() {
  return new DashboardError(
    'dashboard_not_ready',
    'The dashboard is not ready to accept traffic.',
    503,
    { status: 'NOT_READY', reason_codes: ['controlled_beta_shopify_target_unverified'] }
  );
}

test('invalid Shopify authority leaves process liveness healthy and deep readiness fail-closed', async () => {
  let readinessCalls = 0;
  let mutationCalls = 0;
  const api = createDashboardApiHandler({
    services: {
      env: {},
      readiness: async () => { readinessCalls += 1; throw invalidReadiness(); },
      createTheme: async () => { mutationCalls += 1; },
      render: async () => { mutationCalls += 1; },
      recover: async () => { mutationCalls += 1; },
      succeedRenderTarget: async () => { mutationCalls += 1; }
    }
  });

  const health = await invoke(api, '/api/health');
  assert.deepEqual(health, { status: 200, payload: { ok: true, result: { service: 'calinium-dashboard', status: 'ok' } } });
  assert.equal(readinessCalls, 0, 'liveness must not evaluate deep readiness');
  assert.equal(mutationCalls, 0, 'liveness must not start a protected operation');
  assert.equal(Object.hasOwn(health.payload.result, 'merchant_flow'), false, 'liveness must not project an F1 flow');
  assert.equal(Object.hasOwn(health.payload.result, 'preview'), false, 'liveness must not project a merchant preview');

  const ready = await invoke(api, '/api/ready');
  assert.equal(ready.status, 503);
  assert.equal(ready.payload.error.code, 'dashboard_not_ready');
  assert.deepEqual(ready.payload.error.details.reason_codes, ['controlled_beta_shopify_target_unverified']);
  assert.equal(readinessCalls, 1);
  assert.equal(mutationCalls, 0);
});

test('valid deep authority can become ready without changing liveness', async () => {
  let readinessCalls = 0;
  const api = createDashboardApiHandler({
    services: {
      env: {},
      readiness: async () => {
        readinessCalls += 1;
        return { controlled_beta: { status: 'READY', reason_codes: [] } };
      }
    }
  });
  assert.equal((await invoke(api, '/api/health')).status, 200);
  assert.equal(readinessCalls, 0);
  const ready = await invoke(api, '/api/ready');
  assert.equal(ready.status, 200);
  assert.equal(ready.payload.result.status, 'ready');
  assert.equal(ready.payload.result.controlled_beta.status, 'READY');
  assert.equal(readinessCalls, 1);
  assert.equal((await invoke(api, '/api/health')).status, 200);
});

test('Fly routing uses shallow liveness while deep and protected gates remain distinct', () => {
  const fly = fs.readFileSync(path.join(root, 'fly.staging.toml.example'), 'utf8');
  const legacyexampleFly = fs.readFileSync(path.join(root, 'fly.legacyexample-staging.toml.example'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'), 'utf8');
  const services = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-services.cjs'), 'utf8');
  const flowService = fs.readFileSync(path.join(root, 'apps/dashboard/server/services/merchant-generation-flow-service.cjs'), 'utf8');

  assert.match(fly, /\[\[http_service\.checks\]\][\s\S]*?path\s*=\s*"\/api\/health"/);
  assert.match(legacyexampleFly, /\[\[http_service\.checks\]\][\s\S]*?path\s*=\s*"\/api\/ready"/);
  const healthStart = api.indexOf("pathname === '/api/health'");
  const readyStart = api.indexOf("pathname === '/api/ready'");
  const oauthStart = api.indexOf("pathname === '/api/shopify/oauth/callback'");
  const healthBody = api.slice(healthStart, readyStart);
  const readyBody = api.slice(readyStart, oauthStart);
  assert.ok(healthStart >= 0 && readyStart > healthStart && oauthStart > readyStart);
  assert.match(healthBody, /status:\s*'ok'/);
  assert.doesNotMatch(healthBody, /services\./);
  assert.match(readyBody, /services\.readiness\(\)/);
  assert.match(readyBody, /dashboard_not_ready/);
  assert.match(services, /status\s*!==\s*'READY'[\s\S]*?dashboard_not_ready[\s\S]*?503/);

  const successionStart = flowService.indexOf('async succeedRenderTarget({');
  const successionEnd = flowService.indexOf('\n  async ', successionStart + 10);
  const succession = flowService.slice(successionStart, successionEnd < 0 ? undefined : successionEnd);
  assert.ok(succession.indexOf('await this.requireBetaReady()') >= 0);
  assert.ok(succession.indexOf('await this.requireBetaReady()') < succession.indexOf('await this.renderTargetSuccessionResolver.verify'));
  assert.match(flowService, /controlled_beta_runtime_not_ready/);
  assert.match(fly, /CALINIUM_SHOPIFY_MAIN_THEME_ID\s*=\s*"100000000001"/);
  assert.doesNotMatch(fly, /100000000005/);
});

(async () => {
  let passed = 0;
  for (const entry of tests) {
    try {
      await entry.run();
      passed += 1;
      process.stdout.write(`PASS ${entry.name}\n`);
    } catch (error) {
      process.stderr.write(`FAIL ${entry.name}\n${error.stack || error.message}\n`);
      process.exitCode = 1;
      return;
    }
  }
  process.stdout.write(`Fly health/readiness separation tests passed: ${passed}/${tests.length}; API/model calls: 0; Shopify calls: 0; theme mutations: 0.\n`);
})();
