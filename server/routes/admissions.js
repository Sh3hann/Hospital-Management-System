const express = require('express');
const router = express.Router();
const { run, query, queryOne } = require('../db/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/admissions/stats/summary
router.get('/stats/summary', authenticateToken, (req, res) => {
  try {
    const total_admitted = (queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'admitted'") || {}).c || 0;
    const total_discharged = (queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'discharged'") || {}).c || 0;
    const inpatients = (queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'admitted' AND admission_type = 'inpatient'") || {}).c || 0;
    const outpatients = (queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'admitted' AND admission_type = 'outpatient'") || {}).c || 0;
    const emergency = (queryOne("SELECT COUNT(*) as c FROM admissions WHERE status = 'admitted' AND admission_type = 'emergency'") || {}).c || 0;

    res.json({ total_admitted, total_discharged, inpatients, outpatients, emergency });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admissions
router.get('/', authenticateToken, (req, res) => {
  try {
    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
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
    let params = [];

    if (status && status !== 'all') {
      sql += ` WHERE a.status = ?`;
      countSql += ` WHERE a.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY a.id DESC LIMIT ? OFFSET ?`;
    
    const total = (queryOne(countSql, params) || {}).total || 0;
    const data = query(sql, [...params, limit, offset]);

    res.json({ data, total, page, limit });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admissions/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const admission = queryOne(`
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
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admissions
router.post('/', authenticateToken, requireRole('admin', 'doctor', 'nurse', 'receptionist'), (req, res) => {
  try {
    const { patient_id, doctor_id, ward, bed_number, admission_type, diagnosis, notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Patient ID is required' });

    const result = run(`
      INSERT INTO admissions (patient_id, doctor_id, ward, bed_number, admission_type, diagnosis, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [patient_id, doctor_id || null, ward || '', bed_number || '', admission_type || 'inpatient', diagnosis || '', notes || '']);

    res.status(201).json({ id: result.lastId, message: 'Patient admitted successfully' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admissions/:id
router.put('/:id', authenticateToken, requireRole('admin', 'doctor', 'nurse'), (req, res) => {
  try {
    const { ward, bed_number, diagnosis, notes, status, doctor_id } = req.body;
    const current = queryOne('SELECT * FROM admissions WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Admission not found' });

    run(`
      UPDATE admissions 
      SET ward = ?, bed_number = ?, diagnosis = ?, notes = ?, status = ?, doctor_id = ?
      WHERE id = ?
    `, [
      ward ?? current.ward,
      bed_number ?? current.bed_number,
      diagnosis ?? current.diagnosis,
      notes ?? current.notes,
      status ?? current.status,
      doctor_id ?? current.doctor_id,
      req.params.id
    ]);

    res.json({ message: 'Admission details updated' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admissions/:id/discharge
router.put('/:id/discharge', authenticateToken, requireRole('admin', 'doctor', 'nurse'), (req, res) => {
  try {
    const { discharge_notes, discharge_diagnosis } = req.body;
    const current = queryOne('SELECT * FROM admissions WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Admission not found' });

    const now = new Date().toISOString();
    run(`
      UPDATE admissions 
      SET status = 'discharged', discharge_date = ?, discharge_notes = ?, discharge_diagnosis = ?
      WHERE id = ?
    `, [now, discharge_notes || '', discharge_diagnosis || '', req.params.id]);

    res.json({ message: 'Patient discharged successfully' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
