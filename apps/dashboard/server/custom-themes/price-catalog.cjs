'use strict';

const fs = require('fs');
const path = require('path');
const { DashboardError } = require('../lib/errors.cjs');
const { environmentName } = require('../shopify/runtime-configuration.cjs');

const DEFAULT_PRODUCT_CODE = 'calinium_custom_storefront';

function invalidCatalog() {
  throw new DashboardError('custom_theme_price_catalog_invalid', 'Custom storefront pricing is not configured safely.', 503);
}

function readCatalog(root) {
  const file = path.resolve(root, 'config', 'custom-theme-price-catalog.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new DashboardError('custom_theme_price_catalog_invalid', 'Custom storefront pricing is not configured safely.', 503); }
}

function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object' || !/^\d+\.\d+$/.test(String(catalog.catalog_version || '')) || !Array.isArray(catalog.products) || catalog.products.length === 0) invalidCatalog();
  const productCodes = new Set();
  for (const product of catalog.products) {
    if (!product || !/^[a-z][a-z0-9_]{2,80}$/.test(String(product.product_code || '')) || productCodes.has(product.product_code) || typeof product.display_name !== 'string' || product.display_name.trim().length < 3 || product.billing_type !== 'one_time' || !Array.isArray(product.prices) || product.prices.length === 0) invalidCatalog();
    productCodes.add(product.product_code);
    const priceVersions = new Set();
    const activeEnvironmentPrices = new Set();
    for (const price of product.prices) {
      if (!price || !/^[A-Za-z0-9][A-Za-z0-9._-]{1,80}$/.test(String(price.price_version || '')) || priceVersions.has(price.price_version) || !Number.isSafeInteger(price.amount_cents) || price.amount_cents < 1 || !/^[A-Z]{3}$/.test(String(price.currency || '')) || typeof price.active !== 'boolean' || !Array.isArray(price.environments) || price.environments.length === 0) invalidCatalog();
      priceVersions.add(price.price_version);
      for (const environment of price.environments) {
        if (!['development', 'test', 'staging', 'production'].includes(environment)) invalidCatalog();
        if (price.active) {
          const key = `${environment}:${price.price_version}`;
          if (activeEnvironmentPrices.has(key)) invalidCatalog();
          activeEnvironmentPrices.add(key);
        }
      }
    }
    for (const environment of ['development', 'test', 'staging', 'production']) {
      const active = product.prices.filter((price) => price.active && price.environments.includes(environment));
      if (active.length > 1) invalidCatalog();
    }
  }
  return catalog;
}

function activePrice({ root, env = process.env, productCode = null }) {
  const catalog = validateCatalog(readCatalog(root));
  const environment = environmentName(env);
  const code = String(productCode || env.CALINIUM_CUSTOM_THEME_PRODUCT_CODE || DEFAULT_PRODUCT_CODE).trim();
  const product = (catalog.products || []).find((entry) => entry.product_code === code);
  if (!product) return null;
  const price = (product.prices || []).find((entry) => entry.active === true && entry.environments?.includes(environment));
  if (!price) return null;
  return {
    catalog_version: catalog.catalog_version,
    product_code: product.product_code,
    display_name: product.display_name,
    billing_type: product.billing_type,
    price_version: price.price_version,
    amount_cents: price.amount_cents,
    currency: price.currency,
    environment
  };
}

module.exports = { DEFAULT_PRODUCT_CODE, readCatalog, validateCatalog, activePrice };
