const express = require('express');
const { query, queryOne, run } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/medical-records
router.get('/', (req, res) => {
  const { patient_id, doctor_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let sql = `SELECT mr.*, p.first_name, p.last_name, p.mrn, d.name as doctor_name, d.specialization
    FROM medical_records mr JOIN patients p ON mr.patient_id=p.id JOIN doctors d ON mr.doctor_id=d.id WHERE 1=1`;
  const params = [];
  if (patient_id) { sql += ` AND mr.patient_id=?`; params.push(patient_id); }
  if (doctor_id) { sql += ` AND mr.doctor_id=?`; params.push(doctor_id); }
  sql += ` ORDER BY mr.visit_date DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  res.json(query(sql, params));
});

// GET /api/medical-records/:id
router.get('/:id', (req, res) => {
  const record = queryOne(
    `SELECT mr.*, p.first_name, p.last_name, p.mrn, p.dob, p.blood_type, p.allergies,
     d.name as doctor_name, d.specialization FROM medical_records mr
     JOIN patients p ON mr.patient_id=p.id JOIN doctors d ON mr.doctor_id=d.id WHERE mr.id=?`,
    [req.params.id]
  );
  if (!record) return res.status(404).json({ error: 'Record not found' });
  try { record.vitals = JSON.parse(record.vitals || '{}'); } catch(e) {}
  res.json(record);
});

// POST /api/medical-records
router.post('/', (req, res) => {
  const { patient_id, doctor_id, appointment_id, chief_complaint, diagnosis, treatment_plan,
    prescription, notes, vitals, follow_up_date } = req.body;
  if (!patient_id || !doctor_id) return res.status(400).json({ error: 'Patient and doctor required' });

  const r = run(
    `INSERT INTO medical_records (patient_id,doctor_id,appointment_id,visit_date,chief_complaint,
     diagnosis,treatment_plan,prescription,notes,vitals,follow_up_date)
     VALUES (?,?,?,datetime('now'),?,?,?,?,?,?,?)`,
    [patient_id, doctor_id, appointment_id, chief_complaint, diagnosis, treatment_plan,
     prescription, notes, JSON.stringify(vitals || {}), follow_up_date]
  );

  // Update appointment status to completed if appointment_id given
  if (appointment_id) {
    run(`UPDATE appointments SET status='completed' WHERE id=?`, [appointment_id]);
  }

  run(`INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
    [req.user.id, 'CREATE', 'EMR', r.lastId, `Medical record created for patient ${patient_id}`]);

  res.status(201).json(queryOne('SELECT * FROM medical_records WHERE id=?', [r.lastId]));
});

// PUT /api/medical-records/:id
router.put('/:id', (req, res) => {
  const { chief_complaint, diagnosis, treatment_plan, prescription, notes, vitals, follow_up_date } = req.body;
  run(`UPDATE medical_records SET chief_complaint=?,diagnosis=?,treatment_plan=?,prescription=?,
    notes=?,vitals=?,follow_up_date=? WHERE id=?`,
    [chief_complaint, diagnosis, treatment_plan, prescription, notes,
     JSON.stringify(vitals || {}), follow_up_date, req.params.id]
  );
  res.json(queryOne('SELECT * FROM medical_records WHERE id=?', [req.params.id]));
});

module.exports = router;
