import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { DashboardStore } = require('../server/storage/dashboard-store.cjs');
const { PostgresDriver } = require('../server/storage/postgres-driver.cjs');

describe('PostgreSQL production storage contract', () => {
  it('uses bounded pool, timeout, TLS, and application identity options', async () => {
    let observed;
    class Pool {
      constructor(options) { observed = options; }
      async end() {}
    }
    const driver = new PostgresDriver({
      connectionString: 'postgresql://database.internal/calinium_public', ssl: { rejectUnauthorized: true },
      max: 7, idleTimeoutMillis: 21000, maxLifetimeSeconds: 540, connectionTimeoutMillis: 4000, statementTimeoutMillis: 19000,
      applicationName: 'calinium-public', Pool
    });
    expect(observed).toMatchObject({
      connectionString: 'postgresql://database.internal/calinium_public', ssl: { rejectUnauthorized: true }, max: 7,
      idleTimeoutMillis: 21000, maxLifetimeSeconds: 540, connectionTimeoutMillis: 4000, statement_timeout: 19000,
      query_timeout: 19000, application_name: 'calinium-public', keepAlive: true
    });
    await driver.close();
  });

  it('sanitizes connection failures without exposing a connection string or credential', async () => {
    class Pool {
      async query() { throw Object.assign(new Error('password secret-value rejected for db.internal'), { code: '28P01' }); }
      async end() {}
    }
    const driver = new PostgresDriver({ connectionString: 'postgresql://user:secret-value@db.internal/public', Pool });
    await expect(driver.get('SELECT 1')).rejects.toMatchObject({ code: 'postgres_connection_unavailable', provider_code: '28P01' });
    await expect(driver.get('SELECT 1')).rejects.not.toThrow(/secret-value|db\.internal/);
    await driver.close();
  });

  it('rolls a failed migration back with its schema-migration marker', async () => {
    const applied = new Set();
    let commits = 0;
    let rollbacks = 0;
    const driver = {
      dialect: 'postgres',
      async exec() {},
      async transaction(work) {
        const pending = new Set(applied);
        const transaction = {
          dialect: 'postgres',
          async exec(sql) {
            if (sql.includes('CREATE TABLE IF NOT EXISTS project_assets')) throw new Error('synthetic migration failure');
          },
          async get(_sql, [version]) { return pending.has(version) ? { version } : null; },
          async run(_sql, [version]) { pending.add(version); return { changes: 1 }; }
        };
        try { const result = await work(transaction); applied.clear(); for (const version of pending) applied.add(version); commits += 1; return result; }
        catch (error) { rollbacks += 1; throw error; }
      }
    };
    const store = new DashboardStore(driver);
    await expect(store.migrate('2026-09-22T00:00:00.000Z')).rejects.toThrow(/synthetic migration failure/);
    expect([...applied]).toEqual([1]);
    expect(commits).toBe(1);
    expect(rollbacks).toBe(1);
  });
});
