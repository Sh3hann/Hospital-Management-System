// ================================================================
// backend/db/migrate.js
// HMS MySQL Database Migration
// ================================================================

require('dotenv').config({
  path: require('path').join(__dirname, '../.env')
});

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

async function migrate() {
  console.log('📦 HMS MySQL Migration');
  console.log('─'.repeat(40));

  let conn;

  try {
    // ------------------------------------------------------------
    // Connect to MySQL
    // ------------------------------------------------------------
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log(
      `✅ Connected to MySQL at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`
    );

    // ------------------------------------------------------------
    // Read schema
    // ------------------------------------------------------------
    if (!fs.existsSync(SCHEMA_FILE)) {
      throw new Error(`Schema file not found: ${SCHEMA_FILE}`);
    }

    let schema = fs.readFileSync(SCHEMA_FILE, 'utf8');

    // Remove UTF-8 BOM if present
    schema = schema.replace(/^\uFEFF/, '');

    // Normalize Windows line endings
    schema = schema.replace(/\r\n/g, '\n');

    // ------------------------------------------------------------
    // Remove comments
    // ------------------------------------------------------------
    schema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // ------------------------------------------------------------
    // Split SQL statements
    // ------------------------------------------------------------
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`📄 Found ${statements.length} SQL statements`);
    console.log('');

    let success = 0;
    let skipped = 0;

    // ------------------------------------------------------------
    // Execute each statement
    // ------------------------------------------------------------
    for (const statement of statements) {
      try {
        await conn.query(statement);

        success++;

        // Show useful progress
        const firstLine = statement
          .replace(/\s+/g, ' ')
          .substring(0, 80);

        console.log(`✅ ${firstLine}`);
      } catch (err) {
        // Existing database/table/index
        if (
          err.code === 'ER_DB_CREATE_EXISTS' ||
          err.code === 'ER_TABLE_EXISTS_ERROR' ||
          err.code === 'ER_DUP_KEYNAME'
        ) {
          skipped++;

          console.log(`ℹ️  Already exists — skipped`);
        } else {
          console.error('');
          console.error(`❌ Migration error: ${err.message}`);
          console.error('');
          console.error('SQL statement:');
          console.error(statement);
          console.error('');

          throw err;
        }
      }
    }

    console.log('');
    console.log('─'.repeat(40));
    console.log(`✅ Migration complete`);
    console.log(`   Executed: ${success}`);
    console.log(`   Skipped:  ${skipped}`);
    console.log(`   Database: ${process.env.DB_NAME || 'hmsdb'}`);
    console.log('');
    console.log('Next step: npm run seed');

  } catch (err) {
    console.error('');
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;

  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

migrate();