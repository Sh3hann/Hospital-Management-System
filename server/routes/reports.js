const express = require('express');
const { query, queryOne, run } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/reports/dashboard
router.get('/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.substring(0, 7) + '-01';

  const totalPatients = queryOne('SELECT COUNT(*) as c FROM patients WHERE active=1').c;
  const todayAppointments = queryOne(`SELECT COUNT(*) as c FROM appointments WHERE appointment_date=?`, [today]).c;
  const scheduledToday = queryOne(`SELECT COUNT(*) as c FROM appointments WHERE appointment_date=? AND status='scheduled'`, [today]).c;
  const completedToday = queryOne(`SELECT COUNT(*) as c FROM appointments WHERE appointment_date=? AND status='completed'`, [today]).c;
  const pendingLab = queryOne(`SELECT COUNT(*) as c FROM lab_tests WHERE status IN ('requested','in-progress')`).c;
  const pendingPrescriptions = queryOne(`SELECT COUNT(*) as c FROM prescriptions WHERE status='pending'`).c;

  // Revenue
  const monthRevenue = queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE paid_at >= ?`, [monthStart]).total;
  const todayRevenue = queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE paid_at >= ?`, [today]).total;
  const pendingBills = queryOne(`SELECT COUNT(*) as c, COALESCE(SUM(total),0) as amount FROM bills WHERE status IN ('pending','partial')`);

  // New patients this month
  const newPatientsMonth = queryOne(`SELECT COUNT(*) as c FROM patients WHERE registered_at >= ?`, [monthStart]).c;

  // Low stock medicines
  const lowStock = queryOne(`SELECT COUNT(*) as c FROM medicines WHERE stock_qty <= reorder_level AND active=1`).c;

  // Expiring medicines (within 30 days)
  const limit30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const expiring = queryOne(`SELECT COUNT(*) as c FROM medicines WHERE expiry_date <= ? AND active=1`, [limit30]).c;

  // Recent appointments
  const recentAppointments = query(
    `SELECT a.*, p.first_name, p.last_name, p.mrn, d.name as doctor_name, d.specialization
     FROM appointments a JOIN patients p ON a.patient_id=p.id JOIN doctors d ON a.doctor_id=d.id
     WHERE a.appointment_date=? ORDER BY a.appointment_time LIMIT 8`,
    [today]
  );

  // 7-day revenue chart
  const revenueChart = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const rev = queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE date(paid_at)=?`, [d]);
    revenueChart.push({ date: d, revenue: rev.total });
  }

  // Appointment status breakdown today
  const apptBreakdown = query(
    `SELECT status, COUNT(*) as count FROM appointments WHERE appointment_date=? GROUP BY status`, [today]
  );

  res.json({
    stats: {
      total_patients: totalPatients,
      new_patients_month: newPatientsMonth,
      today_appointments: todayAppointments,
      scheduled_today: scheduledToday,
      completed_today: completedToday,
      pending_lab: pendingLab,
      pending_prescriptions: pendingPrescriptions,
      month_revenue: monthRevenue,
      today_revenue: todayRevenue,
      pending_bills_count: pendingBills.c,
      pending_bills_amount: pendingBills.amount,
      low_stock_medicines: lowStock,
      expiring_medicines: expiring,
    },
    recent_appointments: recentAppointments,
    revenue_chart: revenueChart,
    appointment_breakdown: apptBreakdown,
  });
});

// GET /api/reports/patients
router.get('/patients', (req, res) => {
  const { from, to } = req.query;
  const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const registrations = query(
    `SELECT date(registered_at) as date, COUNT(*) as count FROM patients
     WHERE date(registered_at) BETWEEN ? AND ? GROUP BY date(registered_at) ORDER BY date`,
    [fromDate, toDate]
  );
  const genderBreakdown = query('SELECT gender, COUNT(*) as count FROM patients WHERE active=1 GROUP BY gender');
  const bloodTypeBreakdown = query('SELECT blood_type, COUNT(*) as count FROM patients WHERE active=1 AND blood_type IS NOT NULL GROUP BY blood_type');
  const topDiagnoses = query(
    `SELECT diagnosis, COUNT(*) as count FROM medical_records WHERE diagnosis IS NOT NULL GROUP BY diagnosis ORDER BY count DESC LIMIT 10`
  );

  res.json({ registrations, gender_breakdown: genderBreakdown, blood_type_breakdown: bloodTypeBreakdown, top_diagnoses: topDiagnoses });
});

// GET /api/reports/appointments
router.get('/appointments', (req, res) => {
  const { from, to } = req.query;
  const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const daily = query(
    `SELECT appointment_date as date, COUNT(*) as total,
     SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
     SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled,
     SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) as scheduled
     FROM appointments WHERE appointment_date BETWEEN ? AND ?
     GROUP BY appointment_date ORDER BY appointment_date`,
    [fromDate, toDate]
  );
  const byDoctor = query(
    `SELECT d.name as doctor_name, d.specialization, COUNT(*) as total,
     SUM(CASE WHEN a.status='completed' THEN 1 ELSE 0 END) as completed
     FROM appointments a JOIN doctors d ON a.doctor_id=d.id
     WHERE a.appointment_date BETWEEN ? AND ? GROUP BY a.doctor_id ORDER BY total DESC`,
    [fromDate, toDate]
  );
  const byType = query(
    `SELECT type, COUNT(*) as count FROM appointments WHERE appointment_date BETWEEN ? AND ? GROUP BY type`,
    [fromDate, toDate]
  );

  res.json({ daily, by_doctor: byDoctor, by_type: byType });
});

// GET /api/reports/revenue
router.get('/revenue', (req, res) => {
  const { from, to } = req.query;
  const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const daily = query(
    `SELECT date(paid_at) as date, SUM(amount) as revenue, COUNT(*) as transactions
     FROM payments WHERE date(paid_at) BETWEEN ? AND ? GROUP BY date(paid_at) ORDER BY date`,
    [fromDate, toDate]
  );
  const byMethod = query(
    `SELECT method, SUM(amount) as total, COUNT(*) as count FROM payments
     WHERE date(paid_at) BETWEEN ? AND ? GROUP BY method`,
    [fromDate, toDate]
  );
  const summary = queryOne(
    `SELECT COALESCE(SUM(amount),0) as total_revenue, COUNT(*) as transactions FROM payments
     WHERE date(paid_at) BETWEEN ? AND ?`,
    [fromDate, toDate]
  );
  const outstanding = queryOne(
    `SELECT COALESCE(SUM(total),0) as amount, COUNT(*) as count FROM bills WHERE status IN ('pending','partial')`
  );
  const byCategory = query(
    `SELECT json_extract(b.value, '$.type') as category, SUM(json_extract(b.value, '$.amount')) as total
     FROM bills, json_each(bills.items) b WHERE date(bills.created_at) BETWEEN ? AND ?
     GROUP BY category ORDER BY total DESC`,
    [fromDate, toDate]
  );

  res.json({ daily, by_method: byMethod, summary, outstanding, by_category: byCategory });
});

// GET /api/reports/pharmacy
router.get('/pharmacy', (req, res) => {
  const inventory = query('SELECT * FROM medicines WHERE active=1 ORDER BY stock_qty ASC LIMIT 20');
  const limit30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const expiring = query(`SELECT * FROM medicines WHERE expiry_date <= ? AND active=1 ORDER BY expiry_date`, [limit30]);
  const lowStock = query('SELECT * FROM medicines WHERE stock_qty <= reorder_level AND active=1 ORDER BY stock_qty');
  const byCategory = query('SELECT category, COUNT(*) as count, SUM(stock_qty) as total_stock FROM medicines WHERE active=1 GROUP BY category');

  res.json({ inventory, expiring, low_stock: lowStock, by_category: byCategory });
});

// GET /api/reports/lab
router.get('/lab', (req, res) => {
  const { from, to } = req.query;
  const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const byCategory = query(
    `SELECT test_category, COUNT(*) as count, SUM(charge) as revenue FROM lab_tests
     WHERE date(requested_at) BETWEEN ? AND ? GROUP BY test_category ORDER BY count DESC`,
    [fromDate, toDate]
  );
  const byStatus = query(
    `SELECT status, COUNT(*) as count FROM lab_tests WHERE date(requested_at) BETWEEN ? AND ? GROUP BY status`,
    [fromDate, toDate]
  );
  const topTests = query(
    `SELECT test_name, COUNT(*) as count FROM lab_tests WHERE date(requested_at) BETWEEN ? AND ?
     GROUP BY test_name ORDER BY count DESC LIMIT 10`,
    [fromDate, toDate]
  );

  res.json({ by_category: byCategory, by_status: byStatus, top_tests: topTests });
});

// GET /api/reports/staff
router.get('/staff', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const byDept = query(
    `SELECT d.name as department, COUNT(e.id) as count FROM employees e
     LEFT JOIN departments d ON e.department_id=d.id WHERE e.active=1 GROUP BY d.name`
  );
  const todayAttendance = query(
    `SELECT a.*, e.name as employee_name, e.role FROM attendance a
     JOIN employees e ON a.employee_id=e.id WHERE a.date=?`,
    [today]
  );
  const leaveRequests = query(
    `SELECT lr.*, e.name as employee_name FROM leave_requests lr
     JOIN employees e ON lr.employee_id=e.id WHERE lr.status='pending'`
  );

  res.json({ by_department: byDept, today_attendance: todayAttendance, pending_leaves: leaveRequests });
});

module.exports = router;
