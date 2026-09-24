'use strict';

const crypto = require('crypto');
const { DashboardError } = require('../lib/errors.cjs');

class DevelopmentPaymentProvider {
  constructor({ env = process.env } = {}) { this.env = env; this.name = 'development_simulator'; }
  isAvailable() { return this.env.NODE_ENV !== 'production' && this.env.CALINIUM_PAYMENT_MODE === 'development_simulator'; }
  checkoutRequired() { return false; }
  async createPurchase({ order, price }) {
    if (!this.isAvailable()) throw new DashboardError('payment_provider_unavailable', 'A production payment provider is required before a custom storefront can be purchased.', 503);
    const seed = `${order.id}:${price.price_version}:${price.amount_cents}:${price.currency}`;
    return {
      provider: this.name,
      provider_purchase_id: `development-purchase-${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)}`,
      provider_status: 'PENDING',
      amount_cents: price.amount_cents,
      currency: price.currency,
      test_mode: true,
      confirmation_url: null,
      confirmation_url_status: 'not_required'
    };
  }
  async verifyPurchase({ order, purchase, idempotencyKey }) {
    if (!this.isAvailable()) throw new DashboardError('payment_provider_unavailable', 'A production payment provider is required before a custom storefront can be purchased.', 503);
    const seed = `${order.id}:${idempotencyKey || order.idempotency_key}:${order.amount_cents}:${order.currency}`;
    return {
      provider: this.name,
      provider_purchase_id: purchase.provider_purchase_id,
      provider_event_id: `development-payment-${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)}`,
      provider_status: 'ACTIVE',
      payment_status: 'paid',
      amount_cents: order.amount_cents,
      currency: order.currency,
      test_mode: true,
      raw_event_digest: crypto.createHash('sha256').update(`${purchase.provider_purchase_id}:ACTIVE`).digest('hex')
    };
  }
}

module.exports = { DevelopmentPaymentProvider };
