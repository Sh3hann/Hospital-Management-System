// ================================================================
// backend/routes/doctors.js
// ================================================================
const express = require('express');
const { query, queryOne, run } = require('../config/db');
const { authenticateToken }    = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/doctors
router.get('/', async (req, res) => {
  try {
    const { search, department_id } = req.query;
    let sql = `SELECT d.*, dept.name as department_name,
      (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id AND a.status = 'scheduled') as pending_appointments
      FROM doctors d LEFT JOIN departments dept ON d.department_id = dept.id WHERE d.active = 1`;
    const params = [];
    if (search) {
      sql += ` AND (d.name LIKE ? OR d.specialization LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (department_id) {
      sql += ` AND d.department_id = ?`;
      params.push(department_id);
    }
    sql += ` ORDER BY d.name`;
    res.json(await query(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/:id
router.get('/:id', async (req, res) => {
  try {
    const doctor = await queryOne(
      `SELECT d.*, dept.name as department_name FROM doctors d
       LEFT JOIN departments dept ON d.department_id = dept.id WHERE d.id=? AND d.active=1`,
      [req.params.id]
    );
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    try { doctor.schedule = typeof doctor.schedule === 'string' ? JSON.parse(doctor.schedule||'{}') : (doctor.schedule||{}); } catch(_) {}
    const today = new Date().toISOString().split('T')[0];
    doctor.todays_appointments = await query(
      `SELECT a.*, p.first_name, p.last_name, p.mrn FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id=? AND a.appointment_date=? ORDER BY a.appointment_time`,
      [req.params.id, today]
    );
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doctors
router.post('/', async (req, res) => {
  try {
    const { name, specialization, department_id, phone, email, qualification,
      experience_years, consultation_fee, schedule } = req.body;
    if (!name || !specialization) return res.status(400).json({ error: 'Name and specialization required' });
    const r = await run(
      `INSERT INTO doctors (name,specialization,department_id,phone,email,qualification,experience_years,consultation_fee,schedule)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, specialization, department_id||null, phone, email, qualification,
       experience_years||0, consultation_fee||0,
       JSON.stringify(typeof schedule === 'string' ? JSON.parse(schedule||'{}') : (schedule||{}))]
    );
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'CREATE', 'Doctors', r.lastId, `Added doctor: ${name} (${specialization})`]
    );
    res.status(201).json(await queryOne('SELECT * FROM doctors WHERE id=?', [r.lastId]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/doctors/:id
router.put('/:id', async (req, res) => {
  try {
    const doc = await queryOne('SELECT id FROM doctors WHERE id=? AND active=1', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });
    const { name, specialization, department_id, phone, email, qualification,
      experience_years, consultation_fee, schedule } = req.body;
    await run(
      `UPDATE doctors SET name=?,specialization=?,department_id=?,phone=?,email=?,qualification=?,
       experience_years=?,consultation_fee=?,schedule=? WHERE id=?`,
      [name, specialization, department_id||null, phone, email, qualification,
       experience_years, consultation_fee,
       JSON.stringify(typeof schedule === 'string' ? JSON.parse(schedule||'{}') : (schedule||{})),
       req.params.id]
    );
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'UPDATE', 'Doctors', req.params.id, `Updated doctor #${req.params.id}`]
    );
    res.json(await queryOne('SELECT * FROM doctors WHERE id=?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/doctors/:id
router.delete('/:id', async (req, res) => {
  try {
    await run('UPDATE doctors SET active=0 WHERE id=?', [req.params.id]);
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'DELETE', 'Doctors', req.params.id, `Deactivated doctor #${req.params.id}`]
    );
    res.json({ message: 'Doctor removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/:id/availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });
    const doctor = await queryOne('SELECT schedule FROM doctors WHERE id=?', [req.params.id]);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayName = days[new Date(date).getDay()];
    let schedule = {};
    try { schedule = typeof doctor.schedule === 'string' ? JSON.parse(doctor.schedule||'{}') : (doctor.schedule||{}); } catch(_) {}
    const dayHours = schedule[dayName] || '';

    const booked = await query(
      `SELECT appointment_time FROM appointments WHERE doctor_id=? AND appointment_date=? AND status != 'cancelled'`,
      [req.params.id, date]
    );
    const bookedSlots = booked.map(r => {
      const t = r.appointment_time;
      return typeof t === 'string' ? t.substring(0,5) : t;
    });

    let slots = [];
    if (dayHours && dayHours.includes('-')) {
      const [start, end] = dayHours.split('-');
      if (start && end) {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
          let current = sh * 60 + sm;
          const endMins = eh * 60 + em;
          while (current < endMins) {
            const h = Math.floor(current / 60);
            const m = current % 60;
            const time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            slots.push({ time, available: !bookedSlots.includes(time) });
            current += 30;
          }
        }
      }
    }
    res.json({ date, schedule: dayHours, slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
