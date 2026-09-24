import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { assertShopAllowed } = require('../server/shopify/runtime-configuration.cjs');
const { STAGING_VALIDATION_PAYMENT_PROVIDER, legacyStagingConfiguration, stagingBillingBypassEnabled, validateLegacyExampleStagingRuntime } = require('../server/legacyexample-staging-runtime.cjs');
const { StagingValidationPaymentProvider } = require('../server/custom-themes/staging-validation-payment-provider.cjs');
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { CustomThemeService } = require('../server/custom-themes/custom-theme-service.cjs');

function environment(root) {
  const env = {
    NODE_ENV: 'production',
    CALINIUM_ENVIRONMENT: 'staging',
    CALINIUM_APPLICATION_URL: 'https://calinium-legacy-staging.fly.dev',
    CALINIUM_SHOPIFY_CLIENT_ID: '00000000000000000000000000000002',
    CALINIUM_SHOPIFY_CLIENT_SECRET: 'legacyexample-staging-shopify-secret-value',
    CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://calinium-legacy-staging.fly.dev/api/shopify/oauth/callback',
    CALINIUM_SHOPIFY_ADMIN_API_VERSION: '2026-07',
    CALINIUM_SHOPIFY_WEBHOOK_API_VERSION: '2026-07',
    CALINIUM_SHOPIFY_MANAGED_INSTALLATION: 'true',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 17).toString('base64url'),
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID: 'legacyexample-staging-v1',
    CALINIUM_DASHBOARD_SESSION_SECRET: 'legacyexample-staging-dashboard-session-secret-value',
    CALINIUM_EMBEDDED_APP: 'true',
    CALINIUM_STAGING_APP_NAME: 'Calinium LEGACY_EXAMPLE Staging',
    CALINIUM_STAGING_APP_CLIENT_ID: '00000000000000000000000000000002',
    CALINIUM_STAGING_SHOP_DOMAIN: 'calinium-legacy-admin-example.myshopify.com',
    CALINIUM_STAGING_CANONICAL_SHOP_DOMAIN: 'calinium-legacyexample.myshopify.com',
    CALINIUM_ALLOWED_SHOP_DOMAINS: 'calinium-legacyexample.myshopify.com',
    CALINIUM_STORAGE_DRIVER: 'sqlite',
    CALINIUM_PERSISTENT_ROOT: path.join(root, 'output'),
    CALINIUM_SQLITE_PATH: path.join(root, 'output', '.legacyexample-staging', 'dashboard.sqlite'),
    CALINIUM_ASSET_STORAGE_PATH: path.join(root, 'output', '.legacyexample-staging', 'assets'),
    CALINIUM_PAYMENT_PROVIDER: STAGING_VALIDATION_PAYMENT_PROVIDER,
    CALINIUM_STAGING_BILLING_BYPASS_ENABLED: 'true',
    CALINIUM_SHOPIFY_BILLING_TEST_MODE: 'false'
  };
  return env;
}

describe('LEGACY_EXAMPLE staging runtime', () => {
  it('requires an isolated, read-only, persistent staging configuration', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-legacyexample-runtime-'));
    fs.mkdirSync(path.join(root, 'output'), { recursive: true });
    const env = environment(root);
    env.CALINIUM_ALLOWED_SHOP_DOMAINS = 'MERCHANT-ONE.MYSHOPIFY.COM,calinium-legacyexample.myshopify.com';
    const result = validateLegacyExampleStagingRuntime({ env, root, checkFilesystem: true });
    expect(result).toMatchObject({ environment: 'staging', allowed_shop_domains: ['merchant-one.myshopify.com', 'calinium-legacyexample.myshopify.com'], payment_mode: 'staging_no_charge', read_only_theme_generation: true });
  });

  it('rejects CLI tunnel credentials, empty/invalid shop allowlists, secret reuse, and production billing bypass', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-legacyexample-invalid-'));
    const base = environment(root);
    const configuration = legacyStagingConfiguration(base);
    expect(() => validateLegacyExampleStagingRuntime({ env: { ...base, SHOPIFY_API_KEY: 'cli-key' }, root })).toThrow(/CLI development credentials/i);
    expect(() => validateLegacyExampleStagingRuntime({ env: { ...base, CALINIUM_ALLOWED_SHOP_DOMAINS: '' }, root })).toThrow(/at least one approved Shopify shop/i);
    expect(() => validateLegacyExampleStagingRuntime({ env: { ...base, CALINIUM_ALLOWED_SHOP_DOMAINS: 'not-a-shop' }, root })).toThrow(/allow-list is not configured safely/i);
    expect(() => validateLegacyExampleStagingRuntime({ env: { ...base, CALINIUM_DASHBOARD_SESSION_SECRET: base.CALINIUM_SHOPIFY_CLIENT_SECRET }, root })).toThrow(/separate/i);
    expect(stagingBillingBypassEnabled({ ...base, CALINIUM_ENVIRONMENT: 'production' })).toBe(false);
    expect(stagingBillingBypassEnabled({ ...base, CALINIUM_ALLOWED_SHOP_DOMAINS: '' })).toBe(false);
    expect(new StagingValidationPaymentProvider({ shopifyService: {}, env: { ...base, CALINIUM_ENVIRONMENT: 'production' } }).isAvailable()).toBe(false);
    expect(assertShopAllowed(configuration.canonicalShopDomain, base)).toBe(configuration.canonicalShopDomain);
    expect(() => assertShopAllowed(configuration.shopDomain, base)).toThrow(/not authorized/i);
    expect(() => assertShopAllowed('other.myshopify.com', base)).toThrow(/not authorized/i);
  });

  it('records an explicit server-resolved no-charge authorization only for an allowlisted staging shop', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-legacyexample-provider-'));
    const env = environment(root);
    const configuration = legacyStagingConfiguration(env);
    const connection = { id: 'shc_legacyexample', shop_domain: configuration.canonicalShopDomain.toUpperCase() };
    const calls = [];
    const shopifyService = {
      async billingConnection(input) { calls.push(input); return connection; }
    };
    const provider = new StagingValidationPaymentProvider({ shopifyService, env });
    const selected = new CustomThemeService({ root: path.resolve(process.cwd(), '../..'), store: {}, projectService: {}, shopifyService, generator: () => null, env });
    expect(selected.paymentProvider.name).toBe('staging_validation_no_charge');
    const order = { id: 'cto_legacyexample', project_id: 'prj_legacyexample', organization_id: 'org_legacyexample', shopify_connection_id: connection.id, amount_cents: 25000, currency: 'USD', idempotency_key: 'legacyexample-order' };
    const receipt = await provider.createPurchase({ order, price: { price_version: '1.0', amount_cents: 25000, currency: 'USD' } });
    const verification = await provider.verifyPurchase({ order, purchase: receipt, idempotencyKey: 'merchant-staging-authorization' });
    expect(provider.presentation()).toEqual({ mode: 'staging_no_charge', staging: true, charge_created: false, label: 'Calinium staging validation — no Shopify charge' });
    expect(receipt).toMatchObject({ provider_status: 'STAGING_NO_CHARGE_PENDING', test_mode: false, confirmation_url: null });
    expect(verification).toMatchObject({ provider_status: 'STAGING_NO_CHARGE_AUTHORIZED', payment_status: 'paid', test_mode: false });
    expect(verification.provider_event_id).toMatch(/^staging-no-charge-[a-f0-9]{64}$/);
    expect(calls).toHaveLength(2);

    const wrongShop = new StagingValidationPaymentProvider({ shopifyService: { billingConnection: async () => ({ ...connection, shop_domain: 'outside.myshopify.com' }) }, env });
    await expect(wrongShop.createPurchase({ order, price: { price_version: '1.0', amount_cents: 25000, currency: 'USD' } })).rejects.toMatchObject({ code: 'staging_billing_shop_mismatch' });
  });

  it('exposes separate liveness and dependency readiness checks without authentication', async () => {
    const api = createDashboardApiHandler({ services: { env: {}, readiness: async () => ({ persistence: 'ready', asset_storage: 'ready', artifact_storage: 'ready' }) } });
    async function request(url) {
      const input = Readable.from([]);
      Object.assign(input, { method: 'GET', url, headers: { host: 'dashboard.test' }, socket: { remoteAddress: '127.0.0.1' } });
      const response = { status: null, body: '', setHeader() {}, writeHead(status) { this.status = status; }, end(value = '') { this.body += value; } };
      await api(input, response);
      return { status: response.status, payload: JSON.parse(response.body) };
    }
    expect(await request('/api/health')).toMatchObject({ status: 200, payload: { result: { status: 'ok' } } });
    expect(await request('/api/ready')).toMatchObject({ status: 200, payload: { result: { status: 'ready', persistence: 'ready', artifact_storage: 'ready' } } });
  });
});
