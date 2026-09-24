import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  STAGING_VALIDATION_PAYMENT_PROVIDER,
  controlledStagingConfiguration,
  stagingBillingBypassEnabled,
  validateControlledStagingRuntime
} = require('../server/controlled-staging-runtime.cjs');

const APP_ID = '00000000000000000000000000000001';
const SHOP = 'calinium-example.myshopify.com';

function environment(root) {
  return {
    NODE_ENV: 'production',
    CALINIUM_ENVIRONMENT: 'staging',
    CALINIUM_APPLICATION_URL: 'https://calinium-example-staging.fly.dev',
    CALINIUM_STAGING_APP_NAME: 'Calinium Staging',
    CALINIUM_STAGING_APP_CLIENT_ID: APP_ID,
    CALINIUM_SHOPIFY_CLIENT_ID: APP_ID,
    CALINIUM_SHOPIFY_CLIENT_SECRET: 'controlled-staging-shopify-secret-value',
    CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://calinium-example-staging.fly.dev/api/shopify/oauth/callback',
    CALINIUM_SHOPIFY_ADMIN_API_VERSION: '2026-07',
    CALINIUM_SHOPIFY_WEBHOOK_API_VERSION: '2026-07',
    CALINIUM_SHOPIFY_MANAGED_INSTALLATION: 'true',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 29).toString('base64url'),
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID: 'calinium-example-staging-v1',
    CALINIUM_DASHBOARD_SESSION_SECRET: 'controlled-staging-dashboard-session-secret-value',
    CALINIUM_EMBEDDED_APP: 'true',
    CALINIUM_ALLOWED_SHOP_DOMAINS: SHOP,
    CALINIUM_STAGING_SHOP_DOMAIN: SHOP,
    CALINIUM_STAGING_CANONICAL_SHOP_DOMAIN: SHOP,
    CALINIUM_STORAGE_DRIVER: 'sqlite',
    CALINIUM_PERSISTENT_ROOT: path.join(root, 'output'),
    CALINIUM_SQLITE_PATH: path.join(root, 'output', '.calinium-example-staging', 'dashboard.sqlite'),
    CALINIUM_ASSET_STORAGE_PATH: path.join(root, 'output', '.calinium-example-staging', 'assets'),
    CALINIUM_PAYMENT_PROVIDER: STAGING_VALIDATION_PAYMENT_PROVIDER,
    CALINIUM_STAGING_BILLING_BYPASS_ENABLED: 'true',
    CALINIUM_SHOPIFY_BILLING_TEST_MODE: 'false',
    CALINIUM_SHOPIFY_CLI: path.join(root, 'node_modules', '.bin', 'shopify'),
    CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION: '4.6.0',
    CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION: 'shopify-cli-runtime-v1',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: 'shopify-cli-runtime-state-v1',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: path.join(root, 'output', '.calinium-example-staging', 'shopify-cli-runtime-state'),
    CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY: 'disabled',
    CALINIUM_SHOPIFY_MAIN_THEME_ID: '100000000001'
  };
}

describe('controlled staging runtime', () => {
  it('binds one dedicated app, shop, URL, and persistent namespace', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-controlled-staging-'));
    fs.mkdirSync(path.join(root, 'output'), { recursive: true });
    const env = environment(root);
    expect(controlledStagingConfiguration(env)).toMatchObject({ appName: 'Calinium Staging', clientId: APP_ID, canonicalShopDomain: SHOP });
    expect(validateControlledStagingRuntime({ env, root, checkFilesystem: true })).toMatchObject({
      environment: 'staging',
      app_name: 'Calinium Staging',
      allowed_shop_domains: [SHOP],
      payment_mode: 'staging_no_charge',
      read_only_theme_generation: true
    });
    expect(stagingBillingBypassEnabled(env)).toBe(true);
  });

  it('fails closed for another app, shop, URL, or billing environment', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-controlled-staging-invalid-'));
    const env = environment(root);
    expect(() => validateControlledStagingRuntime({ env: { ...env, CALINIUM_STAGING_APP_CLIENT_ID: 'a'.repeat(32) }, root })).toThrow(/wrong Shopify application/i);
    expect(() => validateControlledStagingRuntime({ env: { ...env, CALINIUM_ALLOWED_SHOP_DOMAINS: `${SHOP},outside.myshopify.com` }, root })).toThrow(/exactly its canonical Shopify shop/i);
    expect(() => validateControlledStagingRuntime({ env: { ...env, CALINIUM_APPLICATION_URL: 'https://calinium-legacy-staging.fly.dev' }, root })).toThrow(/invalid Shopify OAuth callback/i);
    expect(stagingBillingBypassEnabled({ ...env, CALINIUM_ENVIRONMENT: 'production' })).toBe(false);
    expect(stagingBillingBypassEnabled({ ...env, CALINIUM_ALLOWED_SHOP_DOMAINS: 'outside.myshopify.com' })).toBe(false);
  });
});
