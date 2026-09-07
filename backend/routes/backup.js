// ================================================================
// backend/routes/backup.js
// Backup & Recovery API endpoints (admin only)
// ================================================================
const express = require('express');
const path    = require('path');
const {
  manualBackup,
  restoreBackup,
  listBackups,
  getBackupHistory,
} = require('../db/backup');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /api/backup/list — List available backup files
router.get('/list', async (req, res) => {
  try {
    const backups = listBackups();
    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/backup/history — Backup history from DB
router.get('/history', async (req, res) => {
  try {
    const history = await getBackupHistory(100);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/backup/trigger — Trigger a manual backup
router.post('/trigger', async (req, res) => {
  try {
    const label  = req.body?.label || 'manual';
    const result = await manualBackup(label);
    if (result.success) {
      res.json({
        success:  true,
        message:  'Backup created successfully',
        fileName: result.fileName,
        filePath: result.filePath,
        sizeBytes:result.size,
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/backup/restore — Restore from a backup file
// Body: { "filePath": "absolute path OR filename in backups/manual/" }
router.post('/restore', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'filePath required' });

    // Resolve relative names to the manual backup dir
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.env.BACKUP_DIR || './backups', 'manual', filePath);

    const result = await restoreBackup(resolved);
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
