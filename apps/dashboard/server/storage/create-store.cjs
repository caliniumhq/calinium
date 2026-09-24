'use strict';

const path = require('path');
const { DashboardStore } = require('./dashboard-store.cjs');
const { SqliteDriver } = require('./sqlite-driver.cjs');
const { PostgresDriver } = require('./postgres-driver.cjs');
const { isoNow } = require('../lib/serialization.cjs');

function boundedInteger(env, key, fallback, { min, max }) {
  const configured = String(env[key] || '').trim();
  if (!configured) return fallback;
  if (!/^\d+$/.test(configured)) throw new Error(`${key} must be an integer from ${min} through ${max}.`);
  const parsed = Number(configured);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`${key} must be an integer from ${min} through ${max}.`);
  return parsed;
}

function postgresConfiguration(env, environment) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required when CALINIUM_STORAGE_DRIVER=postgres.');
  if (environment === 'production' && env.DATABASE_SSL !== 'true') throw new Error('DATABASE_SSL=true is required for Public production PostgreSQL.');
  if (environment === 'production') {
    let url;
    try { url = new URL(env.DATABASE_URL); } catch { throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.'); }
    const sslMode = String(url.searchParams.get('sslmode') || '').toLowerCase();
    if (sslMode && sslMode !== 'verify-full') throw new Error('Public production DATABASE_URL sslmode must be verify-full when explicitly configured.');
    if (url.searchParams.has('ssl')) throw new Error('Public production DATABASE_URL must not override the verified TLS configuration.');
  }
  return {
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    max: boundedInteger(env, 'CALINIUM_DATABASE_POOL_MAX', 10, { min: 1, max: 50 }),
    idleTimeoutMillis: boundedInteger(env, 'CALINIUM_DATABASE_IDLE_TIMEOUT_MS', 300000, { min: 1000, max: 600000 }),
    maxLifetimeSeconds: boundedInteger(env, 'CALINIUM_DATABASE_MAX_LIFETIME_SECONDS', 600, { min: 60, max: 3600 }),
    connectionTimeoutMillis: boundedInteger(env, 'CALINIUM_DATABASE_CONNECTION_TIMEOUT_MS', 5000, { min: 500, max: 60000 }),
    statementTimeoutMillis: boundedInteger(env, 'CALINIUM_DATABASE_STATEMENT_TIMEOUT_MS', 30000, { min: 1000, max: 300000 }),
    applicationName: environment === 'production' ? 'calinium-public' : 'calinium-dashboard'
  };
}

async function createDashboardStore({ root = path.resolve(__dirname, '../../../..'), env = process.env, clock } = {}) {
  const environment = String(env.CALINIUM_ENVIRONMENT || (env.NODE_ENV === 'production' ? 'production' : 'development')).toLowerCase();
  const configuredDriver = String(env.CALINIUM_STORAGE_DRIVER || '').trim().toLowerCase();
  if (environment === 'production' && !configuredDriver) throw new Error('CALINIUM_STORAGE_DRIVER=postgres is required in public production.');
  const driverName = configuredDriver || 'sqlite';
  if (!['sqlite', 'postgres'].includes(driverName)) throw new Error('CALINIUM_STORAGE_DRIVER must be sqlite or postgres.');
  if (environment === 'production' && driverName !== 'postgres') throw new Error('Public production must use PostgreSQL and cannot fall back to SQLite.');
  const driver = driverName === 'postgres'
    ? new PostgresDriver(postgresConfiguration(env, environment))
    : new SqliteDriver({ filename: env.CALINIUM_SQLITE_PATH || path.join(root, '.calinium-data', 'dashboard.sqlite') });
  const store = new DashboardStore(driver);
  await store.migrate(isoNow(clock));
  return store;
}

module.exports = { boundedInteger, createDashboardStore, postgresConfiguration };
