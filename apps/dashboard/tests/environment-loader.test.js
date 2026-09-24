import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { dashboardEnvironmentFile, dashboardRoot, loadDashboardEnvironment } = require('../server/environment.cjs');
const testDirectory = path.dirname(fileURLToPath(import.meta.url));

describe('Dashboard private environment loader', () => {
  it('uses apps/dashboard/.env by module location instead of the command working directory', () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-dashboard-env-'));
    const file = path.join(temporaryRoot, '.env');
    fs.writeFileSync(file, 'placeholder=true\n', 'utf8');
    const environment = {
      APP_URL: 'https://shopify-cli.example',
      SHOPIFY_API_KEY: 'cli-public-key'
    };
    let loadedFile = null;
    const status = loadDashboardEnvironment({
      file,
      environment,
      load(source) {
        loadedFile = source;
        environment.APP_URL = 'https://private-file.example';
        environment.CALINIUM_DASHBOARD_SESSION_SECRET = 'private-dashboard-session-secret-that-is-long-enough';
        environment.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 19).toString('base64url');
      }
    });

    expect(dashboardRoot).toBe(path.resolve(testDirectory, '..'));
    expect(dashboardEnvironmentFile).toBe(path.join(dashboardRoot, '.env'));
    expect(loadedFile).toBe(file);
    expect(environment.APP_URL).toBe('https://shopify-cli.example');
    expect(status).toMatchObject({
      exists: true,
      loaded: true,
      dashboard_session_configured: true,
      token_encryption_configured: true
    });
  });

  it('loads valid secrets from an absolute file while retaining Shopify CLI environment values', () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-dashboard-env-child-'));
    const file = path.join(temporaryRoot, '.env');
    fs.writeFileSync(file, [
      'APP_URL=https://private-file.example',
      'CALINIUM_DASHBOARD_SESSION_SECRET=private-dashboard-session-secret-that-is-long-enough',
      `CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY=${Buffer.alloc(32, 23).toString('base64url')}`
    ].join('\n'), 'utf8');
    const loader = path.join(dashboardRoot, 'server', 'environment.cjs');
    const program = [
      `const { loadDashboardEnvironment } = require(${JSON.stringify(loader)});`,
      `const status = loadDashboardEnvironment({ file: ${JSON.stringify(file)} });`,
      "process.stdout.write(JSON.stringify({ status, app_url: process.env.APP_URL }));"
    ].join(' ');
    const child = spawnSync(process.execPath, ['-e', program], {
      cwd: path.resolve(testDirectory, '..', '..', '..'),
      env: { ...process.env, APP_URL: 'https://shopify-cli.example' },
      encoding: 'utf8'
    });

    expect(child.status).toBe(0);
    const output = JSON.parse(child.stdout);
    expect(output.app_url).toBe('https://shopify-cli.example');
    expect(output.status).toMatchObject({
      exists: true,
      loaded: true,
      dashboard_session_configured: true,
      token_encryption_configured: true
    });
  });
});
