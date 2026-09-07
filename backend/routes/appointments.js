// ================================================================
// backend/routes/appointments.js
// ================================================================
const express = require('express');
const { query, queryOne, run } = require('../config/db');
const { authenticateToken }    = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/appointments
router.get('/', async (req, res) => {
  try {
    const { date, doctor_id, patient_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT a.*, p.first_name, p.last_name, p.mrn, p.phone as patient_phone,
      d.name as doctor_name, d.specialization FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id WHERE 1=1`;
    const params = [];
    if (date)      { sql += ` AND a.appointment_date=?`; params.push(date); }
    if (doctor_id) { sql += ` AND a.doctor_id=?`;        params.push(doctor_id); }
    if (patient_id){ sql += ` AND a.patient_id=?`;       params.push(patient_id); }
    if (status)    { sql += ` AND a.status=?`;           params.push(status); }
    sql += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    const appointments = await query(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM appointments a WHERE 1=1`;
    const countParams = [];
    if (date)      { countSql += ` AND a.appointment_date=?`; countParams.push(date); }
    if (doctor_id) { countSql += ` AND a.doctor_id=?`;        countParams.push(doctor_id); }
    if (patient_id){ countSql += ` AND a.patient_id=?`;       countParams.push(patient_id); }
    if (status)    { countSql += ` AND a.status=?`;           countParams.push(status); }
    const countRow = await queryOne(countSql, countParams);

    res.json({ data: appointments, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appointments/today
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await query(
      `SELECT a.*, p.first_name, p.last_name, p.mrn, d.name as doctor_name, d.specialization
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.appointment_date=? ORDER BY a.appointment_time`,
      [today]
    );
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appointments/calendar
router.get('/calendar', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: 'Year and month required' });
    const y       = parseInt(year);
    const m       = parseInt(month);
    const lastDay = new Date(y, m, 0).getDate();
    const start   = `${y}-${String(m).padStart(2,'0')}-01`;
    const end     = `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const appts   = await query(
      `SELECT appointment_date,
       COUNT(*) as count,
       SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) as scheduled,
       SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM appointments WHERE appointment_date BETWEEN ? AND ?
       GROUP BY appointment_date`,
      [start, end]
    );
    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appointments/:id
router.get('/:id', async (req, res) => {
  try {
    const appt = await queryOne(
      `SELECT a.*, p.first_name, p.last_name, p.mrn, p.phone as patient_phone, p.dob,
       d.name as doctor_name, d.specialization, d.phone as doctor_phone
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id WHERE a.id=?`,
      [req.params.id]
    );
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appointments
router.post('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, type, chief_complaint, notes } = req.body;
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time)
      return res.status(400).json({ error: 'Patient, doctor, date and time required' });

    const conflict = await queryOne(
      `SELECT id FROM appointments WHERE doctor_id=? AND appointment_date=? AND appointment_time=? AND status != 'cancelled'`,
      [doctor_id, appointment_date, appointment_time]
    );
    if (conflict) return res.status(409).json({ error: 'This time slot is already booked' });

    const r = await run(
      `INSERT INTO appointments (patient_id,doctor_id,appointment_date,appointment_time,type,status,chief_complaint,notes,created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [patient_id, doctor_id, appointment_date, appointment_time, type||'consultation',
       'scheduled', chief_complaint, notes, req.user.id]
    );
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'CREATE', 'Appointments', r.lastId,
       `Booked appointment for patient ${patient_id} with doctor ${doctor_id} on ${appointment_date} at ${appointment_time}`]
    );
    res.status(201).json(await queryOne(
      `SELECT a.*, p.first_name, p.last_name, p.mrn, d.name as doctor_name FROM appointments a
       JOIN patients p ON a.patient_id=p.id JOIN doctors d ON a.doctor_id=d.id WHERE a.id=?`,
      [r.lastId]
    ));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/appointments/:id
router.put('/:id', async (req, res) => {
  try {
    const appt = await queryOne('SELECT * FROM appointments WHERE id=?', [req.params.id]);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const { appointment_date, appointment_time, status, type, chief_complaint, notes, doctor_id } = req.body;

    if ((appointment_date || appointment_time) && status !== 'cancelled') {
      const newDate   = appointment_date || appt.appointment_date;
      const newTime   = appointment_time || appt.appointment_time;
      const newDoctor = doctor_id        || appt.doctor_id;
      const conflict  = await queryOne(
        `SELECT id FROM appointments WHERE doctor_id=? AND appointment_date=? AND appointment_time=? AND status != 'cancelled' AND id != ?`,
        [newDoctor, newDate, newTime, req.params.id]
      );
      if (conflict) return res.status(409).json({ error: 'This time slot is already booked' });
    }

    await run(
      `UPDATE appointments SET
        appointment_date=COALESCE(?,appointment_date),
        appointment_time=COALESCE(?,appointment_time),
        status=COALESCE(?,status),
        type=COALESCE(?,type),
        chief_complaint=COALESCE(?,chief_complaint),
        notes=COALESCE(?,notes),
        doctor_id=COALESCE(?,doctor_id)
       WHERE id=?`,
      [appointment_date, appointment_time, status, type, chief_complaint, notes, doctor_id||null, req.params.id]
    );
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'UPDATE', 'Appointments', req.params.id, `Updated appointment #${req.params.id}`]
    );
    res.json(await queryOne('SELECT * FROM appointments WHERE id=?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  try {
    await run(`UPDATE appointments SET status='cancelled' WHERE id=?`, [req.params.id]);
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'CANCEL', 'Appointments', req.params.id, `Cancelled appointment #${req.params.id}`]
    );
    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
