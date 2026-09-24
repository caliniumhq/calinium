'use strict';

const CONNECTION_ERROR_CODES = new Set([
  '28P01', '3D000', '57P03',
  'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'ENOTFOUND', 'ETIMEDOUT',
  'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
]);

function sanitizedConnectionError(error) {
  const providerCode = String(error?.code || '');
  const connectionFailure = CONNECTION_ERROR_CODES.has(providerCode)
    || /^08[A-Z0-9]{3}$/.test(providerCode)
    || /password authentication failed|no pg_hba|certificate|connect(?:ion)? (?:failed|refused|terminated)|getaddrinfo|timed? ?out/i.test(String(error?.message || ''));
  if (!connectionFailure) return error;
  const sanitized = new Error('PostgreSQL connection is unavailable.');
  sanitized.name = 'PostgresConnectionError';
  sanitized.code = 'postgres_connection_unavailable';
  sanitized.provider_code = /^[A-Z0-9_]{2,40}$/.test(providerCode) ? providerCode : null;
  return sanitized;
}

class PostgresDriver {
  constructor({
    connectionString,
    ssl = undefined,
    max = 10,
    idleTimeoutMillis = 300000,
    maxLifetimeSeconds = 600,
    connectionTimeoutMillis = 5000,
    statementTimeoutMillis = 30000,
    applicationName = 'calinium-dashboard',
    Pool: PoolOverride = null
  }) {
    let Pool;
    try { ({ Pool } = PoolOverride ? { Pool: PoolOverride } : require('pg')); } catch (error) {
      error.message = 'PostgreSQL storage requires the dashboard pg dependency. Run npm install in apps/dashboard.';
      throw error;
    }
    this.dialect = 'postgres';
    this.pool = new Pool({
      connectionString,
      ssl,
      max,
      idleTimeoutMillis,
      maxLifetimeSeconds,
      connectionTimeoutMillis,
      statement_timeout: statementTimeoutMillis,
      query_timeout: statementTimeoutMillis,
      application_name: applicationName,
      keepAlive: true
    });
  }

  async query(sql, params = []) {
    try { return await this.pool.query(sql, params); }
    catch (error) { throw sanitizedConnectionError(error); }
  }
  async exec(sql) { await this.query(sql); }
  async run(sql, params = []) { const result = await this.query(sql, params); return { changes: result.rowCount || 0 }; }
  async get(sql, params = []) { const result = await this.query(sql, params); return result.rows[0] || null; }
  async all(sql, params = []) { return (await this.query(sql, params)).rows; }
  async transaction(work) {
    let client;
    try { client = await this.pool.connect(); }
    catch (error) { throw sanitizedConnectionError(error); }
    const transaction = {
      dialect: this.dialect,
      exec: async (sql) => { await client.query(sql); },
      run: async (sql, params = []) => { const result = await client.query(sql, params); return { changes: result.rowCount || 0 }; },
      get: async (sql, params = []) => (await client.query(sql, params)).rows[0] || null,
      all: async (sql, params = []) => (await client.query(sql, params)).rows
    };
    try { await client.query('BEGIN'); const result = await work(transaction); await client.query('COMMIT'); return result; }
    catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw sanitizedConnectionError(error);
    }
    finally { client.release(); }
  }
  async close() { await this.pool.end(); }
}

module.exports = { CONNECTION_ERROR_CODES, PostgresDriver, sanitizedConnectionError };
