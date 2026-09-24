'use strict';

const fs = require('fs');
const path = require('path');

// Shopify CLI may start the dashboard command from the repository root rather
// than apps/dashboard. Resolve the private file from this module instead of
// relying on process.cwd() or a relative Node --env-file flag.
const dashboardRoot = path.resolve(__dirname, '..');
const dashboardEnvironmentFile = path.join(dashboardRoot, '.env');

function configured(value) {
  const normalized = String(value || '').trim();
  return normalized.length > 0 && !/^REPLACE_WITH_/i.test(normalized);
}

function loadDashboardEnvironment({ file = dashboardEnvironmentFile, environment = process.env, load = process.loadEnvFile } = {}) {
  const exists = fs.existsSync(file);
  if (!exists) {
    return {
      file,
      exists: false,
      loaded: false,
      dashboard_session_configured: configured(environment.CALINIUM_DASHBOARD_SESSION_SECRET),
      token_encryption_configured: configured(environment.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY)
    };
  }

  if (typeof load !== 'function') {
    throw new Error('Calinium requires a Node.js runtime that supports process.loadEnvFile().');
  }

  // Shopify CLI supplies temporary APP_URL/HOST and application credentials.
  // Preserve every inherited variable so a private .env fills missing values
  // without overriding the active CLI tunnel or its app session credentials.
  const inherited = new Map(Object.entries(environment));
  load(file);
  for (const [key, value] of inherited) environment[key] = value;

  return {
    file,
    exists: true,
    loaded: true,
    dashboard_session_configured: configured(environment.CALINIUM_DASHBOARD_SESSION_SECRET),
    token_encryption_configured: configured(environment.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY)
  };
}

module.exports = { dashboardRoot, dashboardEnvironmentFile, loadDashboardEnvironment, configured };
