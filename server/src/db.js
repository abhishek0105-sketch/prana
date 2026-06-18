'use strict';

// When DATABASE_URL is absent fall back to the synchronous JSON store.
// Callers always use `await db.method()` — awaiting a plain value is safe.
if (!process.env.DATABASE_URL) {
  module.exports = require('./db-json');
} else {

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

// Called once at server boot — creates schema then migrates JSON data if needed
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clink_store (
      collection TEXT NOT NULL,
      id         TEXT NOT NULL,
      data       JSONB NOT NULL,
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS clink_store_col ON clink_store (collection);
  `);
  console.log('[db] PostgreSQL ready');
  await migrateFromJson();
}

async function migrateFromJson() {
  const fs   = require('fs');
  const path = require('path');
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const COLS = [
    'users', 'friendships', 'hangouts', 'messages', 'transactions',
    'invites', 'push_subscriptions', 'reset_tokens',
  ];

  for (const col of COLS) {
    const file = path.join(DATA_DIR, `${col}.json`);
    if (!fs.existsSync(file)) continue;

    const { rows } = await pool.query(
      'SELECT COUNT(*) FROM clink_store WHERE collection = $1', [col]
    );
    if (parseInt(rows[0].count) > 0) continue; // already migrated

    let items;
    try { items = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { continue; }
    if (!Array.isArray(items) || items.length === 0) continue;

    for (const item of items) {
      const pk = item.id || item.token || item.code;
      if (!pk) continue;
      await pool.query(
        'INSERT INTO clink_store(collection,id,data) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [col, pk, JSON.stringify(item)]
      );
    }
    console.log(`[db] Migrated ${items.length} rows from ${col}.json`);
  }
}

// Resolve the primary key for an item — supports collections that use token or code instead of id
const pk = (item) => {
  const v = item.id ?? item.token ?? item.code;
  if (!v) throw new Error(`db: item has no id/token/code — ${JSON.stringify(item).slice(0, 80)}`);
  return v;
};

const allRows = async (col) => {
  const { rows } = await pool.query(
    'SELECT data FROM clink_store WHERE collection = $1', [col]
  );
  return rows.map(r => r.data);
};

const db = {
  find: async (col, fn) => (await allRows(col)).filter(fn),

  findOne: async (col, fn) => (await allRows(col)).find(fn) ?? null,

  insert: async (col, item) => {
    await pool.query(
      'INSERT INTO clink_store(collection,id,data) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
      [col, pk(item), JSON.stringify(item)]
    );
    return item;
  },

  update: async (col, fn, changes) => {
    const items = (await allRows(col)).filter(fn);
    await Promise.all(items.map(item => {
      const updated = { ...item, ...changes };
      return pool.query(
        'UPDATE clink_store SET data=$1 WHERE collection=$2 AND id=$3',
        [JSON.stringify(updated), col, pk(item)]
      );
    }));
  },

  remove: async (col, fn) => {
    const items = (await allRows(col)).filter(fn);
    await Promise.all(items.map(item =>
      pool.query('DELETE FROM clink_store WHERE collection=$1 AND id=$2', [col, pk(item)])
    ));
  },

  count: async (col, fn) => (await allRows(col)).filter(fn).length,
};

module.exports = { ...db, init };

} // end else (DATABASE_URL set)
