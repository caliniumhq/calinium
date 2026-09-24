'use strict';

const crypto = require('crypto');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { STAGING_VALIDATION_PAYMENT_PROVIDER, stagingBillingBypassEnabled } = require('../controlled-staging-runtime.cjs');
const { allowedShopDomains } = require('../shopify/runtime-configuration.cjs');

class StagingValidationPaymentProvider {
  constructor({ shopifyService, env = process.env } = {}) {
    this.shopifyService = shopifyService;
    this.env = env;
    this.name = STAGING_VALIDATION_PAYMENT_PROVIDER;
  }
  isAvailable() {
    return stagingBillingBypassEnabled(this.env)
      && this.shopifyService
      && typeof this.shopifyService.billingConnection === 'function';
  }
  checkoutRequired() { return false; }
  requiresShopifyConnection() { return true; }
  permitsServerConfirmation() { return true; }
  presentation() {
    return {
      mode: 'staging_no_charge',
      staging: true,
      charge_created: false,
      label: 'Calinium staging validation — no Shopify charge'
    };
  }
  async connection(order) {
    if (!this.isAvailable()) throw new DashboardError('payment_provider_unavailable', 'The Calinium staging validation authorization is unavailable.', 503);
    const connection = await this.shopifyService.billingConnection({
      projectId: order.project_id,
      organizationId: order.organization_id,
      expectedConnectionId: order.shopify_connection_id
    });
    const shopDomain = String(connection?.shop_domain || '').trim().toLowerCase();
    assert(allowedShopDomains(this.env).includes(shopDomain), 'staging_billing_shop_mismatch', 'This order does not belong to an approved controlled staging store.', 403);
    return connection;
  }
  async createPurchase({ order, price }) {
    const connection = await this.connection(order);
    const seed = `${order.id}:${connection.id}:${price.price_version}:${price.amount_cents}:${price.currency}`;
    return {
      provider: this.name,
      provider_purchase_id: `staging-no-charge-${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)}`,
      provider_status: 'STAGING_NO_CHARGE_PENDING',
      amount_cents: price.amount_cents,
      currency: price.currency,
      test_mode: false,
      confirmation_url: null,
      confirmation_url_status: 'not_required'
    };
  }
  async verifyPurchase({ order, purchase, idempotencyKey }) {
    await this.connection(order);
    assert(String(purchase.provider_purchase_id || '').startsWith('staging-no-charge-'), 'staging_billing_reference_invalid', 'The Calinium staging order authorization is invalid.', 409);
    const seed = `${order.id}:${purchase.provider_purchase_id}:${idempotencyKey || order.idempotency_key}`;
    return {
      provider: this.name,
      provider_purchase_id: purchase.provider_purchase_id,
      provider_event_id: `staging-no-charge-${crypto.createHash('sha256').update(seed).digest('hex')}`,
      provider_status: 'STAGING_NO_CHARGE_AUTHORIZED',
      payment_status: 'paid',
      amount_cents: order.amount_cents,
      currency: order.currency,
      test_mode: false,
      raw_event_digest: crypto.createHash('sha256').update(JSON.stringify({ provider: this.name, order_id: order.id, status: 'STAGING_NO_CHARGE_AUTHORIZED', charge_created: false })).digest('hex')
    };
  }
}

module.exports = { StagingValidationPaymentProvider };
