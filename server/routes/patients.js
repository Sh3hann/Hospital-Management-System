const express = require('express');
const { query, queryOne, run } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Generate MRN
function generateMRN() {
  const existing = query('SELECT mrn FROM patients ORDER BY id DESC LIMIT 1');
  if (!existing.length) return 'P00001';
  const last = existing[0].mrn;
  const num = parseInt(last.replace('P', '')) + 1;
  return 'P' + String(num).padStart(5, '0');
}

// GET /api/patients
router.get('/', (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let sql = `SELECT p.*, 
    (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) as appointment_count,
    (SELECT COUNT(*) FROM medical_records mr WHERE mr.patient_id = p.id) as record_count
    FROM patients p WHERE p.active = 1`;
  const params = [];
  if (search) {
    sql += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.mrn LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }
  sql += ` ORDER BY p.registered_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  const patients = query(sql, params);

  const countSql = search
    ? `SELECT COUNT(*) as total FROM patients WHERE active=1 AND (first_name LIKE ? OR last_name LIKE ? OR mrn LIKE ? OR phone LIKE ? OR email LIKE ?)`
    : `SELECT COUNT(*) as total FROM patients WHERE active=1`;
  const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : [];
  const { total } = queryOne(countSql, countParams);

  res.json({ data: patients, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/patients/:id
router.get('/:id', (req, res) => {
  const patient = queryOne(`SELECT * FROM patients WHERE id=? AND active=1`, [req.params.id]);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const appointments = query(
    `SELECT a.*, d.name as doctor_name, d.specialization FROM appointments a
     JOIN doctors d ON a.doctor_id = d.id
     WHERE a.patient_id = ? ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 10`,
    [patient.id]
  );
  const records = query(
    `SELECT mr.*, d.name as doctor_name FROM medical_records mr
     JOIN doctors d ON mr.doctor_id = d.id
     WHERE mr.patient_id = ? ORDER BY mr.visit_date DESC LIMIT 10`,
    [patient.id]
  );
  const labs = query(
    `SELECT lt.*, d.name as doctor_name FROM lab_tests lt
     JOIN doctors d ON lt.doctor_id = d.id
     WHERE lt.patient_id = ? ORDER BY lt.requested_at DESC LIMIT 10`,
    [patient.id]
  );
  const bills = query(
    `SELECT b.*, (SELECT SUM(amount) FROM payments WHERE bill_id=b.id) as paid_amount
     FROM bills b WHERE b.patient_id = ? ORDER BY b.created_at DESC LIMIT 5`,
    [patient.id]
  );
  const documents = query(
    `SELECT * FROM patient_documents WHERE patient_id = ? ORDER BY created_at DESC`,
    [patient.id]
  );

  res.json({ ...patient, appointments, records, labs, bills, documents });
});

// POST /api/patients
router.post('/', (req, res) => {
  const { first_name, last_name, dob, gender, blood_type, phone, email, address,
    emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number,
    allergies, notes } = req.body;

  if (!first_name || !last_name) return res.status(400).json({ error: 'First and last name required' });

  const mrn = generateMRN();
  const r = run(
    `INSERT INTO patients (mrn,first_name,last_name,dob,gender,blood_type,phone,email,address,
     emergency_contact_name,emergency_contact_phone,insurance_provider,insurance_number,allergies,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [mrn, first_name, last_name, dob, gender, blood_type, phone, email, address,
     emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number, allergies, notes]
  );
  run(`INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
    [req.user.id, 'CREATE', 'Patients', r.lastId, `Patient ${mrn} registered`]);

  const patient = queryOne('SELECT * FROM patients WHERE id=?', [r.lastId]);
  res.status(201).json(patient);
});

// PUT /api/patients/:id
router.put('/:id', (req, res) => {
  const patient = queryOne('SELECT * FROM patients WHERE id=? AND active=1', [req.params.id]);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const { first_name, last_name, dob, gender, blood_type, phone, email, address,
    emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number,
    allergies, notes } = req.body;

  run(`UPDATE patients SET first_name=?,last_name=?,dob=?,gender=?,blood_type=?,phone=?,email=?,
    address=?,emergency_contact_name=?,emergency_contact_phone=?,insurance_provider=?,
    insurance_number=?,allergies=?,notes=? WHERE id=?`,
    [first_name, last_name, dob, gender, blood_type, phone, email, address,
     emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number,
     allergies, notes, req.params.id]
  );
  run(`INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
    [req.user.id, 'UPDATE', 'Patients', req.params.id, `Patient ${patient.mrn} updated`]);

  res.json(queryOne('SELECT * FROM patients WHERE id=?', [req.params.id]));
});

// DELETE /api/patients/:id (soft delete)
router.delete('/:id', (req, res) => {
  const patient = queryOne('SELECT * FROM patients WHERE id=? AND active=1', [req.params.id]);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  run('UPDATE patients SET active=0 WHERE id=?', [req.params.id]);
  run(`INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
    [req.user.id, 'DELETE', 'Patients', req.params.id, `Patient ${patient.mrn} deactivated`]);
  res.json({ message: 'Patient deactivated' });
});

// GET /api/patients/:id/documents
router.get('/:id/documents', (req, res) => {
  const docs = query('SELECT * FROM patient_documents WHERE patient_id=? ORDER BY created_at DESC', [req.params.id]);
  res.json(docs);
});

// POST /api/patients/:id/documents (Upload / Save document)
router.post('/:id/documents', (req, res) => {
  const { title, category, file_data, file_name, file_size } = req.body;
  if (!title) return res.status(400).json({ error: 'Document title is required' });

  const patient = queryOne('SELECT id, mrn FROM patients WHERE id=? AND active=1', [req.params.id]);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const r = run(
    `INSERT INTO patient_documents (patient_id, title, category, file_data, file_name, file_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.params.id, title, category || 'medical_report', file_data || '', file_name || 'document.pdf', file_size || 'N/A', req.user.id]
  );

  run(`INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
    [req.user.id, 'UPLOAD', 'Patients', r.lastId, `Uploaded document "${title}" for patient ${patient.mrn}`]);

  res.status(201).json(queryOne('SELECT * FROM patient_documents WHERE id=?', [r.lastId]));
});

module.exports = router;
