'use strict';

const SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION = 'shopify-storefront-password-binding-v1';
const SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION = 'shopify-storefront-password-requirements-v1';
const STOREFRONT_PASSWORD_ENV = 'SHOPIFY_FLAG_STORE_PASSWORD';
const REQUIREMENTS_REVISION_ENV = 'CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION';
const REQUIREMENTS_JSON_ENV = 'CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_JSON';
const SHOP_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;
const REQUIREMENTS = new Set(['required', 'not_required']);
const REQUIREMENT_ENTRY_KEYS = Object.freeze(['requirement', 'shop_domain']);

class ShopifyStorefrontPasswordBindingError extends Error {
  constructor(code, message, { retryable = false } = {}) {
    super(message);
    this.name = 'ShopifyStorefrontPasswordBindingError';
    this.code = code;
    this.retryable = retryable;
  }
}

function bindingError(code, message, options) {
  return new ShopifyStorefrontPasswordBindingError(code, message, options);
}

function normalizeShopDomain(value) {
  const domain = String(value || '').trim().toLowerCase();
  return SHOP_DOMAIN_PATTERN.test(domain) ? domain : null;
}

function withoutShopifyStorefrontPassword(env = {}) {
  const sanitized = { ...env };
  delete sanitized[STOREFRONT_PASSWORD_ENV];
  return sanitized;
}

function isPlainRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, keys) {
  return isPlainRecord(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function safeRequirementResult({ configured, requirements = [], status, reasonCode = null }) {
  return Object.freeze({
    binding_revision: SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION,
    requirements_revision: configured ? SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION : null,
    configured,
    status,
    reason_code: reasonCode,
    requirements: Object.freeze(requirements.map((entry) => Object.freeze({ ...entry })))
  });
}

function readShopifyStorefrontPasswordRequirements(env = process.env, { shopDomains = [] } = {}) {
  if (!Array.isArray(shopDomains)) {
    return safeRequirementResult({
      configured: false,
      status: 'NOT_READY',
      reasonCode: 'shopify_storefront_password_requirement_coverage_invalid'
    });
  }
  const normalizedExpectedShops = shopDomains.map(normalizeShopDomain);
  if (normalizedExpectedShops.some((shop) => !shop)
    || new Set(normalizedExpectedShops).size !== normalizedExpectedShops.length) {
    return safeRequirementResult({
      configured: false,
      status: 'NOT_READY',
      reasonCode: 'shopify_storefront_password_requirement_coverage_invalid'
    });
  }
  const expectedShops = [...normalizedExpectedShops].sort();
  const revision = String(env[REQUIREMENTS_REVISION_ENV] || '').trim();
  const source = String(env[REQUIREMENTS_JSON_ENV] || '').trim();
  if (!revision && !source) {
    return safeRequirementResult({
      configured: false,
      status: 'NOT_READY',
      reasonCode: 'shopify_storefront_password_requirements_missing'
    });
  }
  if (revision !== SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION) {
    return safeRequirementResult({
      configured: false,
      status: 'NOT_READY',
      reasonCode: 'shopify_storefront_password_requirements_revision_invalid'
    });
  }

  let parsed;
  try { parsed = JSON.parse(source); }
  catch {
    return safeRequirementResult({
      configured: false,
      status: 'NOT_READY',
      reasonCode: 'shopify_storefront_password_requirements_json_invalid'
    });
  }
  if (!Array.isArray(parsed)) {
    return safeRequirementResult({
      configured: false,
      status: 'NOT_READY',
      reasonCode: 'shopify_storefront_password_requirements_json_invalid'
    });
  }

  const requirements = [];
  const seen = new Set();
  for (const entry of parsed) {
    if (!hasExactKeys(entry, REQUIREMENT_ENTRY_KEYS)) {
      return safeRequirementResult({
        configured: false,
        status: 'NOT_READY',
        reasonCode: 'shopify_storefront_password_requirement_invalid'
      });
    }
    const shopDomain = normalizeShopDomain(entry?.shop_domain);
    const requirement = typeof entry.requirement === 'string' ? entry.requirement : '';
    if (!shopDomain || entry.shop_domain !== shopDomain || !REQUIREMENTS.has(requirement) || seen.has(shopDomain)) {
      return safeRequirementResult({
        configured: false,
        status: 'NOT_READY',
        reasonCode: 'shopify_storefront_password_requirement_invalid'
      });
    }
    seen.add(shopDomain);
    requirements.push({ shop_domain: shopDomain, requirement });
  }
  requirements.sort((left, right) => left.shop_domain.localeCompare(right.shop_domain));
  if (expectedShops.length !== requirements.length
    || expectedShops.some((shop, index) => requirements[index]?.shop_domain !== shop)) {
    return safeRequirementResult({
      configured: false,
      status: 'NOT_READY',
      reasonCode: 'shopify_storefront_password_requirement_coverage_invalid'
    });
  }
  const required = requirements.filter((entry) => entry.requirement === 'required');
  if (required.length > 1) {
    return safeRequirementResult({
      configured: false,
      requirements,
      status: 'NOT_READY',
      reasonCode: 'shopify_storefront_password_multiple_required_shops_unsupported'
    });
  }
  if (!required.length) return safeRequirementResult({ configured: true, requirements, status: 'NOT_REQUIRED' });
  if (typeof env[STOREFRONT_PASSWORD_ENV] !== 'string' || env[STOREFRONT_PASSWORD_ENV].length === 0) {
    return safeRequirementResult({
      configured: true,
      requirements,
      status: 'NOT_READY',
      reasonCode: 'shopify_storefront_password_required'
    });
  }
  return safeRequirementResult({ configured: true, requirements, status: 'READY' });
}

function assertOperationId(value) {
  const operationId = String(value || '').trim();
  if (!operationId || operationId.length > 200 || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(operationId)) {
    throw bindingError('controlled_beta_storefront_password_binding_scope_invalid', 'Storefront-password binding requires a bounded operation identity.');
  }
  return operationId;
}

function assertThemeDevCommand(args, shopDomain) {
  if (!Array.isArray(args) || args[0] !== 'theme' || args[1] !== 'dev') {
    throw bindingError('controlled_beta_storefront_password_binding_child_command_invalid', 'Storefront-password binding is restricted to the Shopify theme development child.');
  }
  if (args.some((value) => String(value) === '--store-password' || String(value).startsWith('--store-password='))) {
    throw bindingError('controlled_beta_storefront_password_binding_argv_forbidden', 'Storefront-password binding forbids credential transport through argv.');
  }
  if (args.some((value) => String(value).startsWith('--store='))) {
    throw bindingError('controlled_beta_storefront_password_binding_scope_mismatch', 'Storefront-password child command requires one explicit canonical shop binding.');
  }
  const storeIndexes = args.reduce((indexes, value, index) => value === '--store' ? [...indexes, index] : indexes, []);
  if (storeIndexes.length !== 1 || normalizeShopDomain(args[storeIndexes[0] + 1]) !== shopDomain) {
    throw bindingError('controlled_beta_storefront_password_binding_scope_mismatch', 'Storefront-password child command does not match its canonical shop binding.');
  }
  return true;
}

function assertRequirementContract(requirements) {
  if (!isPlainRecord(requirements)
    || requirements.binding_revision !== SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION
    || !Array.isArray(requirements.requirements)
    || typeof requirements.configured !== 'boolean'
    || !['READY', 'NOT_READY', 'NOT_REQUIRED'].includes(requirements.status)) {
    throw bindingError('controlled_beta_storefront_password_binding_requirements_invalid', 'Storefront-password requirements are unavailable or invalid.');
  }
  if (requirements.configured === true
    && requirements.requirements_revision !== SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION) {
    throw bindingError('controlled_beta_storefront_password_binding_requirements_invalid', 'Storefront-password requirement revision is invalid.');
  }
  const seen = new Set();
  let requiredCount = 0;
  for (const entry of requirements.requirements) {
    if (!hasExactKeys(entry, REQUIREMENT_ENTRY_KEYS)
      || normalizeShopDomain(entry.shop_domain) !== entry.shop_domain
      || !REQUIREMENTS.has(entry.requirement)
      || seen.has(entry.shop_domain)) {
      throw bindingError('controlled_beta_storefront_password_binding_requirements_invalid', 'Storefront-password requirement registry is invalid.');
    }
    seen.add(entry.shop_domain);
    if (entry.requirement === 'required') requiredCount += 1;
  }
  if (requiredCount > 1) {
    throw bindingError('controlled_beta_storefront_password_binding_ambiguous', 'Storefront-password binding cannot safely share one process credential across multiple shops.');
  }
  return true;
}

function createShopifyStorefrontPasswordBindingFactory({ env = process.env, requirements } = {}) {
  assertRequirementContract(requirements);
  const byShop = new Map(requirements.requirements.map((entry) => [entry.shop_domain, entry.requirement]));
  const configured = requirements.configured === true;

  return function createBinding({ shopDomain, operationId } = {}) {
    const shop = normalizeShopDomain(shopDomain);
    const operation = assertOperationId(operationId);
    if (!shop || !byShop.has(shop)) {
      throw bindingError('controlled_beta_storefront_password_binding_scope_invalid', 'Storefront-password binding is not configured for this shop.');
    }
    const requirement = byShop.get(shop);
    if (!configured) {
      throw bindingError('controlled_beta_storefront_password_binding_requirement_unknown', 'Storefront password requirements are not safely configured for this shop.');
    }
    const acquiredCredential = env?.[STOREFRONT_PASSWORD_ENV];
    if (requirement === 'required' && (typeof acquiredCredential !== 'string' || acquiredCredential.length === 0)) {
      throw bindingError(
        'shopify_storefront_password_required',
        'The password-protected Shopify storefront requires configured preview authentication.',
        { retryable: true }
      );
    }

    let credential = requirement === 'required' ? acquiredCredential : null;
    let active = true;
    const descriptor = Object.freeze({
      contract_version: SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION,
      shop_domain: shop,
      operation_id: operation,
      requirement,
      status: requirement === 'required' ? 'READY' : 'NOT_REQUIRED'
    });

    function assertActiveScope(candidateShop, candidateOperation) {
      if (!active) throw bindingError('controlled_beta_storefront_password_binding_released', 'Storefront-password binding is no longer active.');
      const candidate = String(candidateOperation || '').trim();
      if (normalizeShopDomain(candidateShop) !== shop || candidate !== operation) {
        throw bindingError('controlled_beta_storefront_password_binding_scope_mismatch', 'Storefront-password binding cannot cross a shop or operation boundary.');
      }
      return true;
    }

    return Object.freeze({
      ...descriptor,
      descriptor,
      describe() { return descriptor; },
      toJSON() { return descriptor; },
      assertScope(scope = {}) {
        return assertActiveScope(scope.shopDomain, scope.operationId);
      },
      childEnvironment(baseEnvironment, scope = {}) {
        assertActiveScope(scope.shopDomain, scope.operationId);
        assertThemeDevCommand(scope.commandArgs, shop);
        if (credential !== null && scope.commandArgs.some((value) => String(value).includes(credential))) {
          throw bindingError('controlled_beta_storefront_password_binding_argv_forbidden', 'Storefront-password binding forbids credential transport through argv.');
        }
        const child = withoutShopifyStorefrontPassword(baseEnvironment);
        if (credential !== null) child[STOREFRONT_PASSWORD_ENV] = credential;
        return child;
      },
      assertNoPersistence(runtimeState, scope = {}) {
        assertActiveScope(scope.shopDomain, scope.operationId);
        if (credential !== null) {
          if (typeof runtimeState?.assertCredentialAbsent !== 'function') {
            throw bindingError('controlled_beta_storefront_password_binding_persistence_guard_missing', 'Storefront-password persistence guard is unavailable.');
          }
          try { runtimeState.assertCredentialAbsent(credential); }
          catch {
            throw bindingError('controlled_beta_storefront_password_binding_persistence_detected', 'Storefront-password persistence prevention failed closed.');
          }
        }
        return true;
      },
      release() {
        if (!active) return false;
        credential = null;
        active = false;
        return true;
      }
    });
  };
}

module.exports = {
  SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION,
  SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION,
  STOREFRONT_PASSWORD_ENV,
  REQUIREMENTS_REVISION_ENV,
  REQUIREMENTS_JSON_ENV,
  ShopifyStorefrontPasswordBindingError,
  normalizeShopDomain,
  withoutShopifyStorefrontPassword,
  assertThemeDevCommand,
  readShopifyStorefrontPasswordRequirements,
  createShopifyStorefrontPasswordBindingFactory
};
