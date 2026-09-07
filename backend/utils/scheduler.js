// ================================================================
// backend/utils/scheduler.js
// Cron-based automated backup scheduler
//   - Daily backup  : every day at 02:00 AM
//   - Weekly backup : every Sunday at 01:00 AM
// ================================================================
const cron = require('node-cron');
const { dailyBackup, weeklyBackup } = require('../db/backup');

function startScheduler() {
  console.log('⏰ Backup scheduler starting...');

  // ── Daily backup — every day at 2:00 AM ──────────────────
  cron.schedule('0 2 * * *', async () => {
    console.log(`\n[Scheduler] 🗓  Daily backup triggered at ${new Date().toISOString()}`);
    const result = await dailyBackup();
    if (result.success) {
      console.log(`[Scheduler] ✅ Daily backup saved: ${result.filePath}`);
    } else {
      console.error(`[Scheduler] ❌ Daily backup failed: ${result.error}`);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // Change to your server timezone
  });

  // ── Weekly full backup — every Sunday at 1:00 AM ─────────
  cron.schedule('0 1 * * 0', async () => {
    console.log(`\n[Scheduler] 📦  Weekly full backup triggered at ${new Date().toISOString()}`);
    const result = await weeklyBackup();
    if (result.success) {
      console.log(`[Scheduler] ✅ Weekly backup saved: ${result.filePath}`);
    } else {
      console.error(`[Scheduler] ❌ Weekly backup failed: ${result.error}`);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  console.log('⏰ Backup scheduler active:');
  console.log('   📅 Daily  — every day at 02:00 AM');
  console.log('   📦 Weekly — every Sunday at 01:00 AM');
}

module.exports = { startScheduler };
