// ================================================================
// backend/routes/reports.js
// ================================================================
const express = require('express');
const { query, queryOne } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const today      = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';
    const limit30    = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const [
      totalPatientsRow,
      todayAppRow,
      scheduledRow,
      completedRow,
      pendingLabRow,
      pendingRxRow,
      monthRevRow,
      todayRevRow,
      pendingBillsRow,
      newPatientsRow,
      lowStockRow,
      expiringRow,
      recentAppointments,
      apptBreakdown,
    ] = await Promise.all([
      queryOne('SELECT COUNT(*) as c FROM patients WHERE active=1'),
      queryOne(`SELECT COUNT(*) as c FROM appointments WHERE appointment_date=?`, [today]),
      queryOne(`SELECT COUNT(*) as c FROM appointments WHERE appointment_date=? AND status='scheduled'`, [today]),
      queryOne(`SELECT COUNT(*) as c FROM appointments WHERE appointment_date=? AND status='completed'`, [today]),
      queryOne(`SELECT COUNT(*) as c FROM lab_tests WHERE status IN ('requested','in-progress')`),
      queryOne(`SELECT COUNT(*) as c FROM prescriptions WHERE status='pending'`),
      queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE paid_at >= ?`, [monthStart]),
      queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE DATE(paid_at) = ?`, [today]),
      queryOne(`SELECT COUNT(*) as c, COALESCE(SUM(total),0) as amount FROM bills WHERE status IN ('pending','partial')`),
      queryOne(`SELECT COUNT(*) as c FROM patients WHERE registered_at >= ?`, [monthStart]),
      queryOne(`SELECT COUNT(*) as c FROM medicines WHERE stock_qty <= reorder_level AND active=1`),
      queryOne(`SELECT COUNT(*) as c FROM medicines WHERE expiry_date <= ? AND active=1`, [limit30]),
      query(
        `SELECT a.*, p.first_name, p.last_name, p.mrn, d.name as doctor_name, d.specialization
         FROM appointments a JOIN patients p ON a.patient_id=p.id JOIN doctors d ON a.doctor_id=d.id
         WHERE a.appointment_date=? ORDER BY a.appointment_time LIMIT 8`,
        [today]
      ),
      query(
        `SELECT status, COUNT(*) as count FROM appointments WHERE appointment_date=? GROUP BY status`,
        [today]
      ),
    ]);

    // 7-day revenue chart
    const revenueChart = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const rev = await queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE DATE(paid_at)=?`, [d]);
      revenueChart.push({ date: d, revenue: rev?.total || 0 });
    }

    res.json({
      stats: {
        total_patients:       totalPatientsRow?.c  || 0,
        new_patients_month:   newPatientsRow?.c    || 0,
        today_appointments:   todayAppRow?.c        || 0,
        scheduled_today:      scheduledRow?.c       || 0,
        completed_today:      completedRow?.c       || 0,
        pending_lab:          pendingLabRow?.c      || 0,
        pending_prescriptions:pendingRxRow?.c       || 0,
        month_revenue:        monthRevRow?.total    || 0,
        today_revenue:        todayRevRow?.total    || 0,
        pending_bills_count:  pendingBillsRow?.c    || 0,
        pending_bills_amount: pendingBillsRow?.amount|| 0,
        low_stock_medicines:  lowStockRow?.c        || 0,
        expiring_medicines:   expiringRow?.c        || 0,
      },
      recent_appointments:  recentAppointments,
      revenue_chart:        revenueChart,
      appointment_breakdown:apptBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/patients
router.get('/patients', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
    const toDate   = to   || new Date().toISOString().split('T')[0];

    const [registrations, genderBreakdown, bloodTypeBreakdown, topDiagnoses] = await Promise.all([
      query(
        `SELECT DATE(registered_at) as date, COUNT(*) as count FROM patients
         WHERE DATE(registered_at) BETWEEN ? AND ? GROUP BY DATE(registered_at) ORDER BY date`,
        [fromDate, toDate]
      ),
      query('SELECT gender, COUNT(*) as count FROM patients WHERE active=1 GROUP BY gender'),
      query('SELECT blood_type, COUNT(*) as count FROM patients WHERE active=1 AND blood_type IS NOT NULL GROUP BY blood_type'),
      query(`SELECT diagnosis, COUNT(*) as count FROM medical_records WHERE diagnosis IS NOT NULL GROUP BY diagnosis ORDER BY count DESC LIMIT 10`),
    ]);

    res.json({ registrations, gender_breakdown: genderBreakdown, blood_type_breakdown: bloodTypeBreakdown, top_diagnoses: topDiagnoses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/appointments
router.get('/appointments', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now()-30*86400000).toISOString().split('T')[0];
    const toDate   = to   || new Date().toISOString().split('T')[0];

    const [daily, byDoctor, byType] = await Promise.all([
      query(
        `SELECT appointment_date as date, COUNT(*) as total,
         SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) as scheduled
         FROM appointments WHERE appointment_date BETWEEN ? AND ?
         GROUP BY appointment_date ORDER BY appointment_date`,
        [fromDate, toDate]
      ),
      query(
        `SELECT d.name as doctor_name, d.specialization, COUNT(*) as total,
         SUM(CASE WHEN a.status='completed' THEN 1 ELSE 0 END) as completed
         FROM appointments a JOIN doctors d ON a.doctor_id=d.id
         WHERE a.appointment_date BETWEEN ? AND ? GROUP BY a.doctor_id ORDER BY total DESC`,
        [fromDate, toDate]
      ),
      query(
        `SELECT type, COUNT(*) as count FROM appointments WHERE appointment_date BETWEEN ? AND ? GROUP BY type`,
        [fromDate, toDate]
      ),
    ]);

    res.json({ daily, by_doctor: byDoctor, by_type: byType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/revenue
router.get('/revenue', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now()-30*86400000).toISOString().split('T')[0];
    const toDate   = to   || new Date().toISOString().split('T')[0];

    const [daily, byMethod, summary, outstanding] = await Promise.all([
      query(
        `SELECT DATE(paid_at) as date, SUM(amount) as revenue, COUNT(*) as transactions
         FROM payments WHERE DATE(paid_at) BETWEEN ? AND ? GROUP BY DATE(paid_at) ORDER BY date`,
        [fromDate, toDate]
      ),
      query(
        `SELECT method, SUM(amount) as total, COUNT(*) as count FROM payments
         WHERE DATE(paid_at) BETWEEN ? AND ? GROUP BY method`,
        [fromDate, toDate]
      ),
      queryOne(
        `SELECT COALESCE(SUM(amount),0) as total_revenue, COUNT(*) as transactions
         FROM payments WHERE DATE(paid_at) BETWEEN ? AND ?`,
        [fromDate, toDate]
      ),
      queryOne(`SELECT COALESCE(SUM(total),0) as amount, COUNT(*) as count FROM bills WHERE status IN ('pending','partial')`),
    ]);

    res.json({ daily, by_method: byMethod, summary, outstanding });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/pharmacy
router.get('/pharmacy', async (req, res) => {
  try {
    const limit30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const [inventory, expiring, lowStock, byCategory] = await Promise.all([
      query('SELECT * FROM medicines WHERE active=1 ORDER BY stock_qty ASC LIMIT 20'),
      query(`SELECT * FROM medicines WHERE expiry_date <= ? AND active=1 ORDER BY expiry_date`, [limit30]),
      query('SELECT * FROM medicines WHERE stock_qty <= reorder_level AND active=1 ORDER BY stock_qty'),
      query('SELECT category, COUNT(*) as count, SUM(stock_qty) as total_stock FROM medicines WHERE active=1 GROUP BY category'),
    ]);
    res.json({ inventory, expiring, low_stock: lowStock, by_category: byCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/lab
router.get('/lab', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now()-30*86400000).toISOString().split('T')[0];
    const toDate   = to   || new Date().toISOString().split('T')[0];

    const [byCategory, byStatus, topTests] = await Promise.all([
      query(
        `SELECT test_category, COUNT(*) as count, SUM(charge) as revenue FROM lab_tests
         WHERE DATE(requested_at) BETWEEN ? AND ? GROUP BY test_category ORDER BY count DESC`,
        [fromDate, toDate]
      ),
      query(
        `SELECT status, COUNT(*) as count FROM lab_tests WHERE DATE(requested_at) BETWEEN ? AND ? GROUP BY status`,
        [fromDate, toDate]
      ),
      query(
        `SELECT test_name, COUNT(*) as count FROM lab_tests WHERE DATE(requested_at) BETWEEN ? AND ?
         GROUP BY test_name ORDER BY count DESC LIMIT 10`,
        [fromDate, toDate]
      ),
    ]);

    res.json({ by_category: byCategory, by_status: byStatus, top_tests: topTests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/staff
router.get('/staff', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [byDept, todayAttendance, leaveRequests] = await Promise.all([
      query(`SELECT d.name as department, COUNT(e.id) as count FROM employees e
             LEFT JOIN departments d ON e.department_id=d.id WHERE e.active=1 GROUP BY d.name`),
      query(`SELECT a.*, e.name as employee_name, e.role FROM attendance a
             JOIN employees e ON a.employee_id=e.id WHERE a.date=?`, [today]),
      query(`SELECT lr.*, e.name as employee_name FROM leave_requests lr
             JOIN employees e ON lr.employee_id=e.id WHERE lr.status='pending'`),
    ]);
    res.json({ by_department: byDept, today_attendance: todayAttendance, pending_leaves: leaveRequests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/audit-trail
router.get('/audit-trail', async (req, res) => {
  try {
    const { page = 1, limit = 50, module, action, from, to } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT al.*, u.username, u.full_name FROM audit_logs al
               LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
    const params = [];
    if (module) { sql += ` AND al.module=?`;           params.push(module); }
    if (action) { sql += ` AND al.action=?`;           params.push(action); }
    if (from)   { sql += ` AND al.timestamp >= ?`;     params.push(from); }
    if (to)     { sql += ` AND al.timestamp <= ?`;     params.push(to); }
    sql += ` ORDER BY al.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    const logs = await query(sql, params);
    res.json({ data: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
