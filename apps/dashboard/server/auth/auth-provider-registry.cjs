'use strict';

const { PasswordAuthProvider } = require('./password-auth-provider.cjs');
const { DashboardError } = require('../lib/errors.cjs');

class AuthProviderRegistry {
  constructor(providers = []) { this.providers = new Map(providers.map((provider) => [provider.id, provider])); }
  get(id) {
    const provider = this.providers.get(id);
    if (!provider) throw new DashboardError('authentication_provider_unavailable', 'That sign-in method is not available.', 400);
    return provider;
  }
  available() { return [...this.providers.keys()]; }
}

function createAuthProviderRegistry({ store }) {
  return new AuthProviderRegistry([new PasswordAuthProvider({ store })]);
}

module.exports = { AuthProviderRegistry, createAuthProviderRegistry };
