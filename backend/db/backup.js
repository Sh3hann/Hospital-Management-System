// ================================================================
// backend/db/backup.js
// Backup & Recovery module
//   - dailyBackup()   → exports to backups/daily/
//   - weeklyBackup()  → exports to backups/weekly/
//   - listBackups()   → returns available backup files
//   - restoreBackup() → restores from a file (disaster recovery)
// ================================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { exec }  = require('child_process');
const { promisify } = require('util');
const fs        = require('fs');
const path      = require('path');
const { run, query, queryOne } = require('../config/db');

const execAsync = promisify(exec);

const BACKUP_DIR      = path.resolve(process.env.BACKUP_DIR || './backups');
const RETAIN_DAYS     = parseInt(process.env.BACKUP_RETAIN_DAYS) || 30;
const MYSQLDUMP_PATH  = process.env.MYSQLDUMP_PATH || 'mysqldump';

const DB_HOST = process.env.DB_HOST     || 'localhost';
const DB_PORT = process.env.DB_PORT     || '3306';
const DB_USER = process.env.DB_USER     || 'root';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME     || 'hms_db';

// ── Ensure backup directories exist ─────────────────────────
function ensureDirs() {
  const dirs = [
    path.join(BACKUP_DIR, 'daily'),
    path.join(BACKUP_DIR, 'weekly'),
    path.join(BACKUP_DIR, 'manual'),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

// ── Build mysqldump command ───────────────────────────────────
function buildDumpCmd(outFile, opts = '') {
  // Use MYSQL_PWD env var so the password isn't visible in process list
  const passEnv = DB_PASS ? `set MYSQL_PWD=${DB_PASS} && ` : '';
  return (
    `${passEnv}${MYSQLDUMP_PATH} ` +
    `--host=${DB_HOST} --port=${DB_PORT} --user=${DB_USER} ` +
    `--single-transaction --routines --triggers ${opts} ` +
    `${DB_NAME} > "${outFile}"`
  );
}

// ── Timestamp helper ─────────────────────────────────────────
function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

// ── Log backup result to DB ──────────────────────────────────
async function logBackup(type, filePath, status, errorMsg = null) {
  let fileSize = null;
  try {
    if (fs.existsSync(filePath)) {
      fileSize = fs.statSync(filePath).size;
    }
  } catch (_) {}

  try {
    await run(
      `INSERT INTO backup_logs (type, file_path, file_size, status, error_msg) VALUES (?,?,?,?,?)`,
      [type, filePath, fileSize, status, errorMsg]
    );
  } catch (_) {
    // Best-effort; don't throw if audit log fails
  }
}

// ═══════════════════════════════════════════════════════════════
// DAILY BACKUP  — schema + data dump
// ═══════════════════════════════════════════════════════════════
async function dailyBackup() {
  ensureDirs();
  const fileName = `daily_${timestamp()}.sql`;
  const filePath = path.join(BACKUP_DIR, 'daily', fileName);
  console.log(`[Backup] Starting daily backup → ${filePath}`);

  try {
    const cmd = buildDumpCmd(filePath);
    await execAsync(cmd, { shell: true });
    const size = fs.statSync(filePath).size;
    console.log(`[Backup] ✅ Daily backup complete (${(size/1024).toFixed(1)} KB)`);
    await logBackup('daily', filePath, 'success');
    await cleanOldBackups('daily');
    return { success: true, filePath, size };
  } catch (err) {
    console.error('[Backup] ❌ Daily backup failed:', err.message);
    await logBackup('daily', filePath, 'failed', err.message);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY FULL BACKUP  — full schema + data + create database
// ═══════════════════════════════════════════════════════════════
async function weeklyBackup() {
  ensureDirs();
  const fileName = `weekly_full_${timestamp()}.sql`;
  const filePath = path.join(BACKUP_DIR, 'weekly', fileName);
  console.log(`[Backup] Starting weekly full backup → ${filePath}`);

  try {
    const cmd = buildDumpCmd(filePath, '--add-drop-database --databases');
    await execAsync(cmd, { shell: true });
    const size = fs.statSync(filePath).size;
    console.log(`[Backup] ✅ Weekly backup complete (${(size/1024).toFixed(1)} KB)`);
    await logBackup('weekly', filePath, 'success');
    await cleanOldBackups('weekly', 90); // keep weekly for 90 days
    return { success: true, filePath, size };
  } catch (err) {
    console.error('[Backup] ❌ Weekly backup failed:', err.message);
    await logBackup('weekly', filePath, 'failed', err.message);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// MANUAL BACKUP  — triggered via API
// ═══════════════════════════════════════════════════════════════
async function manualBackup(label = 'manual') {
  ensureDirs();
  const fileName = `${label}_${timestamp()}.sql`;
  const filePath = path.join(BACKUP_DIR, 'manual', fileName);
  console.log(`[Backup] Starting manual backup → ${filePath}`);

  try {
    const cmd = buildDumpCmd(filePath);
    await execAsync(cmd, { shell: true });
    const size = fs.statSync(filePath).size;
    await logBackup('manual', filePath, 'success');
    return { success: true, filePath, fileName, size };
  } catch (err) {
    await logBackup('manual', filePath, 'failed', err.message);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// RESTORE  — Disaster Recovery
// ═══════════════════════════════════════════════════════════════
async function restoreBackup(filePath) {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'Backup file not found: ' + filePath };
  }

  console.log(`[Restore] ⚠️  Restoring from: ${filePath}`);
  const passEnv = DB_PASS ? `set MYSQL_PWD=${DB_PASS} && ` : '';
  const cmd = (
    `${passEnv}mysql ` +
    `--host=${DB_HOST} --port=${DB_PORT} --user=${DB_USER} ` +
    `${DB_NAME} < "${filePath}"`
  );

  try {
    await execAsync(cmd, { shell: true });
    console.log('[Restore] ✅ Restore complete');
    await logBackup('restore', filePath, 'success');
    return { success: true, message: 'Database restored successfully' };
  } catch (err) {
    console.error('[Restore] ❌ Restore failed:', err.message);
    await logBackup('restore', filePath, 'failed', err.message);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// LIST AVAILABLE BACKUPS
// ═══════════════════════════════════════════════════════════════
function listBackups() {
  ensureDirs();
  const result = {};
  for (const type of ['daily', 'weekly', 'manual']) {
    const dir = path.join(BACKUP_DIR, type);
    result[type] = fs.readdirSync(dir)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        return {
          filename:   f,
          path:       full,
          sizeBytes:  stat.size,
          sizeKB:     (stat.size / 1024).toFixed(1),
          createdAt:  stat.mtime,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// CLEAN OLD BACKUPS
// ═══════════════════════════════════════════════════════════════
async function cleanOldBackups(type = 'daily', retainDays = RETAIN_DAYS) {
  const dir = path.join(BACKUP_DIR, type);
  if (!fs.existsSync(dir)) return;

  const cutoff = Date.now() - retainDays * 86400 * 1000;
  const files  = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));
  let removed  = 0;

  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.mtime.getTime() < cutoff) {
      fs.unlinkSync(full);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`[Backup] 🗑️  Removed ${removed} old ${type} backup(s) (older than ${retainDays} days)`);
  }
}

// ═══════════════════════════════════════════════════════════════
// BACKUP HISTORY (from DB)
// ═══════════════════════════════════════════════════════════════
async function getBackupHistory(limit = 50) {
  try {
    return await query(
      'SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  } catch (_) {
    return [];
  }
}

module.exports = {
  dailyBackup,
  weeklyBackup,
  manualBackup,
  restoreBackup,
  listBackups,
  cleanOldBackups,
  getBackupHistory,
};
