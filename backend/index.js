// ================================================================
// backend/index.js
// HMS Backend Server Entry Point
// Node.js + Express + MySQL
// ================================================================
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');

const { initDB }       = require('./config/db');
const { auditTrail }   = require('./middleware/audit');
const { startScheduler } = require('./utils/scheduler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Serve Frontend (static) ─────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Audit Trail (applied to API routes) ─────────────────────
app.use('/api', auditTrail);

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/patients',       require('./routes/patients'));
app.use('/api/doctors',        require('./routes/doctors'));
app.use('/api/appointments',   require('./routes/appointments'));
app.use('/api/medical-records',require('./routes/medical-records'));
app.use('/api/admissions',     require('./routes/admissions'));
app.use('/api/lab',            require('./routes/lab'));
app.use('/api/pharmacy',       require('./routes/pharmacy'));
app.use('/api/billing',        require('./routes/billing'));
app.use('/api/staff',          require('./routes/staff'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/backup',         require('./routes/backup'));

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'HMS Backend',
    version:   '2.0.0',
    database:  'MySQL',
    timestamp: new Date().toISOString(),
  });
});

// ─── SPA Catch-All ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Boot ─────────────────────────────────────────────────────
async function start() {
  try {
    // 1. Connect to MySQL
    await initDB();
    console.log(`✅ MySQL connected (${process.env.DB_HOST}:${process.env.DB_PORT || 3306} → ${process.env.DB_NAME})`);

    // 2. Start HTTP server
    app.listen(PORT, () => {
      console.log('\n╔══════════════════════════════════════════════╗');
      console.log('║   🏥  MediCare Hospital Management System    ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log(`🚀  Server  : http://localhost:${PORT}`);
      console.log(`🗄️   Database: MySQL — ${process.env.DB_NAME}`);
      console.log(`🔐  Auth    : JWT (${process.env.JWT_EXPIRES_IN || '8h'})`);
      console.log('──────────────────────────────────────────────');
    });

    // 3. Start backup scheduler
    startScheduler();

  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('\n💡 Checklist:');
    console.error('   1. Is MySQL running?');
    console.error('   2. Did you edit backend/.env with your credentials?');
    console.error('   3. Did you run: npm run migrate && npm run seed');
    process.exit(1);
  }
}

start();
