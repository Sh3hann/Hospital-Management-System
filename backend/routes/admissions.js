// ================================================================
// backend/routes/admissions.js
// ================================================================
const express = require('express');
const { query, queryOne, run }          = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/admissions/stats/summary
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const [a, b, c, d, e] = await Promise.all([
      queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'admitted'"),
      queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'discharged'"),
      queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'admitted' AND admission_type = 'inpatient'"),
      queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'admitted' AND admission_type = 'outpatient'"),
      queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'admitted' AND admission_type = 'emergency'"),
    ]);
    res.json({
      total_admitted:   a?.c || 0,
      total_discharged: b?.c || 0,
      inpatients:       c?.c || 0,
      outpatients:      d?.c || 0,
      emergency:        e?.c || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admissions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const status = req.query.status;
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT a.*,
             p.first_name, p.last_name, p.mrn, p.gender, p.dob, p.phone,
             d.name as doctor_name, d.specialization
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
    `;
    let countSql = `SELECT COUNT(*) as total FROM admissions a`;
    let params   = [];

    if (status && status !== 'all') {
      sql      += ` WHERE a.status = ?`;
      countSql += ` WHERE a.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY a.id DESC LIMIT ? OFFSET ?`;
    const countRow = await queryOne(countSql, params);
    const data     = await query(sql, [...params, limit, offset]);

    res.json({ data, total: countRow?.total || 0, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admissions/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const admission = await queryOne(`
      SELECT a.*,
             p.first_name, p.last_name, p.mrn, p.gender, p.dob, p.phone, p.blood_type, p.allergies,
             d.name as doctor_name, d.specialization
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ?
    `, [req.params.id]);
    if (!admission) return res.status(404).json({ error: 'Admission record not found' });
    res.json(admission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admissions
router.post('/', authenticateToken, requireRole('admin','doctor','nurse','receptionist'), async (req, res) => {
  try {
    const { patient_id, doctor_id, ward, bed_number, admission_type, diagnosis, notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Patient ID is required' });

    const r = await run(
      `INSERT INTO admissions (patient_id,doctor_id,ward,bed_number,admission_type,diagnosis,notes)
       VALUES (?,?,?,?,?,?,?)`,
      [patient_id, doctor_id||null, ward||'', bed_number||'', admission_type||'inpatient', diagnosis||'', notes||'']
    );
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'CREATE', 'Admissions', r.lastId, `Patient ${patient_id} admitted`]
    );
    res.status(201).json({ id: r.lastId, message: 'Patient admitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admissions/:id
router.put('/:id', authenticateToken, requireRole('admin','doctor','nurse'), async (req, res) => {
  try {
    const { ward, bed_number, diagnosis, notes, status, doctor_id } = req.body;
    const current = await queryOne('SELECT * FROM admissions WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Admission not found' });

    await run(
      `UPDATE admissions SET ward=?,bed_number=?,diagnosis=?,notes=?,status=?,doctor_id=? WHERE id=?`,
      [
        ward        ?? current.ward,
        bed_number  ?? current.bed_number,
        diagnosis   ?? current.diagnosis,
        notes       ?? current.notes,
        status      ?? current.status,
        doctor_id   ?? current.doctor_id,
        req.params.id,
      ]
    );
    res.json({ message: 'Admission details updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admissions/:id/discharge
router.put('/:id/discharge', authenticateToken, requireRole('admin','doctor','nurse'), async (req, res) => {
  try {
    const { discharge_notes, discharge_diagnosis } = req.body;
    const current = await queryOne('SELECT * FROM admissions WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Admission not found' });

    await run(
      `UPDATE admissions SET status='discharged', discharge_date=NOW(), discharged_at=NOW(),
       discharge_notes=?, discharge_diagnosis=? WHERE id=?`,
      [discharge_notes||'', discharge_diagnosis||'', req.params.id]
    );
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'UPDATE', 'Admissions', req.params.id, `Patient discharged from admission #${req.params.id}`]
    );
    res.json({ message: 'Patient discharged successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
