const express = require('express');
const { query, queryOne, run } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/lab/stats/summary — MUST be before /:id to avoid route collision
router.get('/stats/summary', (req, res) => {
  const stats = {
    total: queryOne('SELECT COUNT(*) as c FROM lab_tests').c,
    requested: queryOne('SELECT COUNT(*) as c FROM lab_tests WHERE status="requested"').c,
    in_progress: queryOne('SELECT COUNT(*) as c FROM lab_tests WHERE status="in-progress"').c,
    completed: queryOne('SELECT COUNT(*) as c FROM lab_tests WHERE status="completed"').c,
  };
  res.json(stats);
});

// GET /api/lab
router.get('/', (req, res) => {
  const { patient_id, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let sql = `SELECT lt.*, p.first_name, p.last_name, p.mrn, d.name as doctor_name
    FROM lab_tests lt JOIN patients p ON lt.patient_id=p.id JOIN doctors d ON lt.doctor_id=d.id WHERE 1=1`;
  const params = [];
  if (patient_id) { sql += ` AND lt.patient_id=?`; params.push(patient_id); }
  if (status) { sql += ` AND lt.status=?`; params.push(status); }
  sql += ` ORDER BY lt.requested_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  const tests = query(sql, params);
  const { total } = queryOne(`SELECT COUNT(*) as total FROM lab_tests WHERE 1=1${patient_id?' AND patient_id=?':''}${status?' AND status=?':''}`,
    [...(patient_id?[patient_id]:[]), ...(status?[status]:[])]);
  res.json({ data: tests, total });
});

// GET /api/lab/:id
router.get('/:id', (req, res) => {
  const test = queryOne(
    `SELECT lt.*, p.first_name, p.last_name, p.mrn, p.dob, p.gender,
     d.name as doctor_name, d.specialization FROM lab_tests lt
     JOIN patients p ON lt.patient_id=p.id JOIN doctors d ON lt.doctor_id=d.id WHERE lt.id=?`,
    [req.params.id]
  );
  if (!test) return res.status(404).json({ error: 'Lab test not found' });
  res.json(test);
});

// POST /api/lab (request a test)
router.post('/', (req, res) => {
  const { patient_id, doctor_id, test_name, test_category, priority, charge } = req.body;
  if (!patient_id || !doctor_id || !test_name) return res.status(400).json({ error: 'Patient, doctor, test name required' });
  const r = run(
    `INSERT INTO lab_tests (patient_id,doctor_id,test_name,test_category,priority,status,charge)
     VALUES (?,?,?,?,?,?,?)`,
    [patient_id, doctor_id, test_name, test_category, priority || 'normal', 'requested', charge || 0]
  );
  run(`INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
    [req.user.id, 'CREATE', 'Lab', r.lastId, `Lab test requested: ${test_name} for patient ${patient_id}`]);
  res.status(201).json(queryOne('SELECT * FROM lab_tests WHERE id=?', [r.lastId]));
});

// PUT /api/lab/:id (update status, add result)
router.put('/:id', (req, res) => {
  const { status, result, reference_range, remarks, sample_collected_at } = req.body;
  let completed_at = null;
  if (status === 'completed') completed_at = new Date().toISOString();

  run(`UPDATE lab_tests SET status=COALESCE(?,status), result=COALESCE(?,result),
    reference_range=COALESCE(?,reference_range), remarks=COALESCE(?,remarks),
    sample_collected_at=COALESCE(?,sample_collected_at),
    technician_id=?, completed_at=COALESCE(?,completed_at) WHERE id=?`,
    [status, result, reference_range, remarks, sample_collected_at,
     req.user.id, completed_at, req.params.id]
  );
  run(`INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
    [req.user.id, 'UPDATE', 'Lab', req.params.id, `Lab test updated: status=${status}`]);
  res.json(queryOne('SELECT * FROM lab_tests WHERE id=?', [req.params.id]));
});

module.exports = router;
