'use strict';

const { DashboardError } = require('../lib/errors.cjs');

class PaymentProvider {
  constructor({ name = 'unconfigured' } = {}) { this.name = name; }
  isAvailable() { return false; }
  checkoutRequired() { return false; }
  async createPurchase() { throw new DashboardError('payment_provider_unavailable', 'Custom storefront payment is not available in this environment.', 503); }
  async verifyPurchase() { throw new DashboardError('payment_provider_unavailable', 'Custom storefront payment is not available in this environment.', 503); }
}

module.exports = { PaymentProvider };
