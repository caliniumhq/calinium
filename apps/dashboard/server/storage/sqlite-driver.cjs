'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function sqliteStatement(sql, parameters) {
  const values = [];
  const statement = sql.replace(/\$(\d+)/g, (_, position) => {
    values.push(parameters[Number(position) - 1]);
    return '?';
  });
  return { statement, values };
}

class SqliteDriver {
  constructor({ filename }) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.dialect = 'sqlite';
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    // node:sqlite uses one synchronous connection. Queue top-level async
    // transactions so repeated browser returns or test workers cannot issue a
    // second BEGIN while the first durable transition is still in progress.
    this.transactionTail = Promise.resolve();
  }

  async exec(sql) { this.database.exec(sql); }
  async run(sql, params = []) {
    const query = sqliteStatement(sql, params);
    const result = this.database.prepare(query.statement).run(...query.values);
    return { changes: Number(result.changes || 0), lastInsertRowid: result.lastInsertRowid };
  }
  async get(sql, params = []) { const query = sqliteStatement(sql, params); return this.database.prepare(query.statement).get(...query.values) || null; }
  async all(sql, params = []) { const query = sqliteStatement(sql, params); return this.database.prepare(query.statement).all(...query.values); }
  async transaction(work) {
    let release;
    const previous = this.transactionTail;
    this.transactionTail = new Promise((resolve) => { release = resolve; });
    await previous;
    let began = false;
    try {
      this.database.exec('BEGIN IMMEDIATE'); began = true;
      const result = await work(this); this.database.exec('COMMIT'); began = false; return result;
    } catch (error) {
      if (began) this.database.exec('ROLLBACK');
      throw error;
    } finally { release(); }
  }
  async close() { this.database.close(); }
}

module.exports = { SqliteDriver };
