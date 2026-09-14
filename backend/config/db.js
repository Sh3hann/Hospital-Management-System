// ============================================================
// backend/config/db.js
// MySQL Connection Pool — uses mysql2/promise
// Mirrors the same API as the old SQLite db.js so all
// route files just need to be made async.
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

let pool = null;

/**
 * Create (or return existing) MySQL connection pool.
 */
async function initDB() {
  if (pool) return pool;

  pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'hmsdb',
    waitForConnections: true,
    connectionLimit:    20,
    queueLimit:         0,
    timezone:           'Z',           // Store/retrieve as UTC
    multipleStatements: false,

    ssl: {
  rejectUnauthorized: false
},

  });

  // Test the connection
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();

  return pool;
}

/**
 * Get the active pool (throws if not initialized yet).
 */
function getPool() {
  if (!pool) throw new Error('Database not initialized. Call initDB() first.');
  return pool;
}

// ─── Query helpers ────────────────────────────────────────

/**
 * Execute a SELECT and return all rows.
 * @param {string} sql
 * @param {any[]}  params
 * @returns {Promise<object[]>}
 */
async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

/**
 * Execute a SELECT and return the first row (or null).
 * @param {string} sql
 * @param {any[]}  params
 * @returns {Promise<object|null>}
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Execute an INSERT / UPDATE / DELETE.
 * Returns { lastId, affectedRows, changedRows }.
 * @param {string} sql
 * @param {any[]}  params
 * @returns {Promise<{lastId: number, affectedRows: number, changedRows: number}>}
 */
async function run(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return {
    lastId:       result.insertId       || null,
    affectedRows: result.affectedRows   || 0,
    changedRows:  result.changedRows    || 0,
  };
}

/**
 * Execute multiple INSERT statements in a single transaction.
 * @param {string}  sql
 * @param {any[][]} paramsArray
 */
async function runMany(sql, paramsArray) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    for (const params of paramsArray) {
      await conn.execute(sql, params);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Run several SQL statements inside a single transaction.
 * @param {Function} fn  async (conn) => { ... }
 */
async function transaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { initDB, getPool, query, queryOne, run, runMany, transaction };
