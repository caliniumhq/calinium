import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { ShopifyOneTimeBillingProvider, centsToDecimal, paymentStatus } = require('../server/custom-themes/shopify-one-time-billing-provider.cjs');
const { ShopifyAdminApiAdapter, moneyToCents, normalizeOneTimePurchase } = require('../server/shopify/admin-api-adapter.cjs');

const baseEnv = {
  CALINIUM_ENVIRONMENT: 'development',
  CALINIUM_SHOPIFY_CLIENT_ID: 'billing-test-client',
  CALINIUM_SHOPIFY_CLIENT_SECRET: 'billing-test-secret',
  CALINIUM_APPLICATION_URL: 'https://billing.example',
  CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://billing.example/api/shopify/oauth/callback',
  CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64url')
};

function service(adapter) {
  return {
    adapter,
    async billingConnection({ expectedConnectionId }) { return { id: expectedConnectionId || 'shc_1', shop_domain: 'fixture.myshopify.com', connection_status: 'ready', credential_status: 'active' }; },
    async connectionAccess() { return 'encrypted-server-token'; }
  };
}
function order() {
  return { id: 'cto_billing', project_id: 'prj_1', organization_id: 'org_1', shopify_connection_id: 'shc_1', product_name: 'Calinium custom storefront', amount_cents: 100, currency: 'USD' };
}

describe('Shopify one-time billing provider', () => {
  it('preserves safe Shopify billing user errors without exposing a GraphQL payload', async () => {
    const adapter = new ShopifyAdminApiAdapter({
      fetchImpl: async () => new Response(JSON.stringify({
        data: {
          appPurchaseOneTimeCreate: {
            userErrors: [{ field: ['returnUrl'], message: 'The return URL is not permitted for this app.' }],
            appPurchaseOneTime: null,
            confirmationUrl: null
          }
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    });
    await expect(adapter.createOneTimePurchase({
      shopDomain: 'fixture.myshopify.com', accessToken: 'server-only-token', name: 'Calinium custom storefront', amount: '1.00', currency: 'USD', returnUrl: 'https://billing.example/projects/prj_1/design', test: true
    })).rejects.toMatchObject({
      code: 'shopify_billing_purchase_rejected',
      details: { stage: 'payment_preparation', reasons: [{ field: 'returnUrl', message: 'The return URL is not permitted for this app.' }] }
    });
  });

  it('uses an Admin GraphQL one-time purchase and verifies only matching active purchases', async () => {
    const calls = [];
    const adapter = {
      async createOneTimePurchase(input) { calls.push({ type: 'create', input }); return { id: 'gid://shopify/AppPurchaseOneTime/7', name: input.name, status: 'PENDING', test: true, amount_cents: 100, currency: 'USD', confirmation_url: 'https://fixture.myshopify.com/confirm', created_at: '2026-07-24T00:00:00Z' }; },
      async getOneTimePurchase(input) { calls.push({ type: 'get', input }); return { id: input.purchaseId, name: 'Calinium custom storefront', status: 'ACTIVE', test: true, amount_cents: 100, currency: 'USD', created_at: '2026-07-24T00:00:00Z' }; }
    };
    const provider = new ShopifyOneTimeBillingProvider({ shopifyService: service(adapter), env: baseEnv });
    const purchase = await provider.createPurchase({ order: order(), price: { display_name: 'Calinium custom storefront', amount_cents: 100, currency: 'USD' }, returnUrl: 'https://billing.example/projects/prj_1/design' });
    expect(purchase.provider_purchase_id).toBe('gid://shopify/AppPurchaseOneTime/7');
    expect(calls[0].input).toMatchObject({ amount: '1.00', currency: 'USD', test: true });
    const verified = await provider.verifyPurchase({ order: order(), purchase });
    expect(verified).toMatchObject({ payment_status: 'paid', provider_status: 'ACTIVE', amount_cents: 100, currency: 'USD' });
    expect(JSON.stringify({ purchase, verified })).not.toContain('encrypted-server-token');
  });

  it('rejects mismatched prices and does not treat a redirect or pending status as payment', async () => {
    const adapter = {
      async createOneTimePurchase() { return { id: 'gid://shopify/AppPurchaseOneTime/8', name: 'Calinium custom storefront', status: 'PENDING', test: true, amount_cents: 100, currency: 'USD', confirmation_url: 'https://fixture.myshopify.com/confirm' }; },
      async getOneTimePurchase({ purchaseId }) { return { id: purchaseId, name: 'Calinium custom storefront', status: 'PENDING', test: true, amount_cents: 100, currency: 'USD' }; }
    };
    const provider = new ShopifyOneTimeBillingProvider({ shopifyService: service(adapter), env: baseEnv });
    const purchase = await provider.createPurchase({ order: order(), price: { display_name: 'Calinium custom storefront', amount_cents: 100, currency: 'USD' }, returnUrl: 'https://billing.example/projects/prj_1/design' });
    expect((await provider.verifyPurchase({ order: order(), purchase })).payment_status).toBe('pending');
    adapter.getOneTimePurchase = async ({ purchaseId }) => ({ id: purchaseId, name: 'Calinium custom storefront', status: 'ACTIVE', test: true, amount_cents: 101, currency: 'USD' });
    await expect(provider.verifyPurchase({ order: order(), purchase })).rejects.toMatchObject({ code: 'shopify_billing_amount_mismatch' });
    adapter.getOneTimePurchase = async ({ purchaseId }) => ({ id: purchaseId, name: 'Calinium custom storefront', status: 'ACTIVE', test: true, amount_cents: 100, currency: 'EUR' });
    await expect(provider.verifyPurchase({ order: order(), purchase })).rejects.toMatchObject({ code: 'shopify_billing_currency_mismatch' });
  });

  it('normalizes Shopify billing money exactly and keeps the simulator unavailable in production', () => {
    expect(centsToDecimal(24900)).toBe('249.00');
    expect(moneyToCents('249.01')).toBe(24901);
    expect(normalizeOneTimePurchase({ id: 'gid://shopify/AppPurchaseOneTime/1', name: 'Theme', status: 'ACTIVE', test: true, createdAt: '2026-07-24T00:00:00Z', price: { amount: '1.50', currencyCode: 'USD' } })).toMatchObject({ amount_cents: 150, currency: 'USD' });
    expect(paymentStatus('DECLINED')).toBe('declined');
    expect(paymentStatus('CANCELLED')).toBe('cancelled');
    expect(paymentStatus('PENDING')).toBe('pending');
    const { DevelopmentPaymentProvider } = require('../server/custom-themes/development-payment-provider.cjs');
    expect(new DevelopmentPaymentProvider({ env: { NODE_ENV: 'production', CALINIUM_PAYMENT_MODE: 'development_simulator' } }).isAvailable()).toBe(false);
    expect(new ShopifyAdminApiAdapter({ fetchImpl: null }).apiVersion).toMatch(/^20\d{2}-\d{2}$/);
  });
});
