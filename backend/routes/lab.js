// ================================================================
// backend/routes/lab.js
// ================================================================
const express = require('express');
const { query, queryOne, run } = require('../config/db');
const { authenticateToken }    = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/lab/stats/summary — MUST be before /:id
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, requested, inProgress, completed] = await Promise.all([
      queryOne('SELECT COUNT(*) as c FROM lab_tests'),
      queryOne("SELECT COUNT(*) as c FROM lab_tests WHERE status='requested'"),
      queryOne("SELECT COUNT(*) as c FROM lab_tests WHERE status='in-progress'"),
      queryOne("SELECT COUNT(*) as c FROM lab_tests WHERE status='completed'"),
    ]);
    res.json({
      total:       total?.c || 0,
      requested:   requested?.c || 0,
      in_progress: inProgress?.c || 0,
      completed:   completed?.c || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lab
router.get('/', async (req, res) => {
  try {
    const { patient_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT lt.*, p.first_name, p.last_name, p.mrn, d.name as doctor_name
      FROM lab_tests lt JOIN patients p ON lt.patient_id=p.id JOIN doctors d ON lt.doctor_id=d.id WHERE 1=1`;
    const params = [];
    if (patient_id) { sql += ` AND lt.patient_id=?`; params.push(patient_id); }
    if (status)     { sql += ` AND lt.status=?`;     params.push(status); }
    sql += ` ORDER BY lt.requested_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    const tests = await query(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM lab_tests WHERE 1=1`;
    const countParams = [];
    if (patient_id) { countSql += ` AND patient_id=?`; countParams.push(patient_id); }
    if (status)     { countSql += ` AND status=?`;     countParams.push(status); }
    const countRow = await queryOne(countSql, countParams);

    res.json({ data: tests, total: countRow?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lab/:id
router.get('/:id', async (req, res) => {
  try {
    const test = await queryOne(
      `SELECT lt.*, p.first_name, p.last_name, p.mrn, p.dob, p.gender,
       d.name as doctor_name, d.specialization FROM lab_tests lt
       JOIN patients p ON lt.patient_id=p.id JOIN doctors d ON lt.doctor_id=d.id WHERE lt.id=?`,
      [req.params.id]
    );
    if (!test) return res.status(404).json({ error: 'Lab test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lab
router.post('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, test_name, test_category, priority, charge } = req.body;
    if (!patient_id || !doctor_id || !test_name)
      return res.status(400).json({ error: 'Patient, doctor, test name required' });
    const r = await run(
      `INSERT INTO lab_tests (patient_id,doctor_id,test_name,test_category,priority,status,charge)
       VALUES (?,?,?,?,?,?,?)`,
      [patient_id, doctor_id, test_name, test_category, priority||'normal', 'requested', charge||0]
    );
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'CREATE', 'Lab', r.lastId, `Lab test requested: ${test_name} for patient ${patient_id}`]
    );
    res.status(201).json(await queryOne('SELECT * FROM lab_tests WHERE id=?', [r.lastId]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/lab/:id
router.put('/:id', async (req, res) => {
  try {
    const { status, result, reference_range, remarks, sample_collected_at } = req.body;
    const completed_at = status === 'completed' ? new Date().toISOString() : null;

    await run(
      `UPDATE lab_tests SET
        status=COALESCE(?,status),
        result=COALESCE(?,result),
        reference_range=COALESCE(?,reference_range),
        remarks=COALESCE(?,remarks),
        sample_collected_at=COALESCE(?,sample_collected_at),
        technician_id=?,
        completed_at=COALESCE(?,completed_at)
       WHERE id=?`,
      [status, result, reference_range, remarks, sample_collected_at||null,
       req.user.id, completed_at, req.params.id]
    );
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'UPDATE', 'Lab', req.params.id, `Lab test updated: status=${status}`]
    );
    res.json(await queryOne('SELECT * FROM lab_tests WHERE id=?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
