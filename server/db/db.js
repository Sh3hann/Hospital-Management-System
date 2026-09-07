const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'hms.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;
let SQL = null;

async function initDB() {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Run schema definitions
  if (fs.existsSync(SCHEMA_PATH)) {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      try {
        db.run(stmt);
      } catch (e) {
        // Table or index may already exist
      }
    }
  }

  // Run automatic column migrations for admissions
  const admissionsCols = [
    { name: 'admission_type', sql: 'ALTER TABLE admissions ADD COLUMN admission_type TEXT DEFAULT "inpatient"' },
    { name: 'discharge_diagnosis', sql: 'ALTER TABLE admissions ADD COLUMN discharge_diagnosis TEXT' },
    { name: 'discharge_notes', sql: 'ALTER TABLE admissions ADD COLUMN discharge_notes TEXT' }
  ];

  for (const col of admissionsCols) {
    try {
      db.run(col.sql);
    } catch (e) {
      // Column already exists
    }
  }

  saveDB();
  return db;
}

function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function query(sql, params = []) {
  const d = getDB();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  const d = getDB();
  d.run(sql, params);
  const result = d.exec('SELECT last_insert_rowid() as id');
  const lastId = result.length > 0 ? result[0].values[0][0] : null;
  saveDB();
  return { lastId };
}

function runMany(sql, paramsArray) {
  const d = getDB();
  const stmt = d.prepare(sql);
  for (const params of paramsArray) {
    stmt.run(params);
  }
  stmt.free();
  saveDB();
}

module.exports = { initDB, getDB, saveDB, query, queryOne, run, runMany };
