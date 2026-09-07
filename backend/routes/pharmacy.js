// ================================================================
// backend/routes/pharmacy.js
// ================================================================
const express = require('express');
const { query, queryOne, run } = require('../config/db');
const { authenticateToken }    = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── MEDICINES ────────────────────────────────────────────

// GET /api/pharmacy/medicines
router.get('/medicines', async (req, res) => {
  try {
    const { search, category, low_stock, near_expiry, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT * FROM medicines WHERE active=1`;
    const params = [];
    if (search) {
      sql += ` AND (name LIKE ? OR generic_name LIKE ? OR batch_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category)            { sql += ` AND category=?`; params.push(category); }
    if (low_stock === 'true')  sql += ` AND stock_qty <= reorder_level`;
    if (near_expiry === 'true') {
      const limit30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      sql += ` AND expiry_date <= '${limit30}'`;
    }
    sql += ` ORDER BY name LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    const medicines = await query(sql, params);

    const limit30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const [totalRow, lowRow, expRow] = await Promise.all([
      queryOne('SELECT COUNT(*) as c FROM medicines WHERE active=1'),
      queryOne('SELECT COUNT(*) as c FROM medicines WHERE active=1 AND stock_qty <= reorder_level'),
      queryOne(`SELECT COUNT(*) as c FROM medicines WHERE active=1 AND expiry_date <= '${limit30}'`),
    ]);

    res.json({
      data:           medicines,
      total:          totalRow?.c || 0,
      low_stock_count:lowRow?.c  || 0,
      expiring_count: expRow?.c  || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pharmacy/medicines/:id
router.get('/medicines/:id', async (req, res) => {
  try {
    const med = await queryOne('SELECT * FROM medicines WHERE id=? AND active=1', [req.params.id]);
    if (!med) return res.status(404).json({ error: 'Medicine not found' });
    res.json(med);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pharmacy/medicines
router.post('/medicines', async (req, res) => {
  try {
    const { name, generic_name, category, dosage_form, strength, manufacturer,
      stock_qty, unit_price, reorder_level, expiry_date, batch_number } = req.body;
    if (!name) return res.status(400).json({ error: 'Medicine name required' });
    const r = await run(
      `INSERT INTO medicines (name,generic_name,category,dosage_form,strength,manufacturer,
       stock_qty,unit_price,reorder_level,expiry_date,batch_number) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [name, generic_name, category, dosage_form, strength, manufacturer,
       stock_qty||0, unit_price||0, reorder_level||10, expiry_date||null, batch_number]
    );
    res.status(201).json(await queryOne('SELECT * FROM medicines WHERE id=?', [r.lastId]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pharmacy/medicines/:id
router.put('/medicines/:id', async (req, res) => {
  try {
    const { name, generic_name, category, dosage_form, strength, manufacturer,
      stock_qty, unit_price, reorder_level, expiry_date, batch_number } = req.body;
    await run(
      `UPDATE medicines SET name=?,generic_name=?,category=?,dosage_form=?,strength=?,
       manufacturer=?,stock_qty=?,unit_price=?,reorder_level=?,expiry_date=?,batch_number=? WHERE id=?`,
      [name, generic_name, category, dosage_form, strength, manufacturer,
       stock_qty, unit_price, reorder_level, expiry_date||null, batch_number, req.params.id]
    );
    res.json(await queryOne('SELECT * FROM medicines WHERE id=?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pharmacy/medicines/:id/stock
router.patch('/medicines/:id/stock', async (req, res) => {
  try {
    const { adjustment, type } = req.body;
    const med = await queryOne('SELECT * FROM medicines WHERE id=?', [req.params.id]);
    if (!med) return res.status(404).json({ error: 'Medicine not found' });
    const newQty = type === 'subtract' ? med.stock_qty - adjustment : med.stock_qty + adjustment;
    if (newQty < 0) return res.status(400).json({ error: 'Insufficient stock' });
    await run('UPDATE medicines SET stock_qty=? WHERE id=?', [newQty, req.params.id]);
    res.json({ ...med, stock_qty: newQty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PRESCRIPTIONS ────────────────────────────────────────

// GET /api/pharmacy/prescriptions
router.get('/prescriptions', async (req, res) => {
  try {
    const { patient_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT pr.*, p.first_name, p.last_name, p.mrn, d.name as doctor_name
      FROM prescriptions pr JOIN patients p ON pr.patient_id=p.id JOIN doctors d ON pr.doctor_id=d.id WHERE 1=1`;
    const params = [];
    if (patient_id) { sql += ` AND pr.patient_id=?`; params.push(patient_id); }
    if (status)     { sql += ` AND pr.status=?`;     params.push(status); }
    sql += ` ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    res.json({ data: await query(sql, params) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pharmacy/prescriptions/:id
router.get('/prescriptions/:id', async (req, res) => {
  try {
    const pres = await queryOne(
      `SELECT pr.*, p.first_name, p.last_name, p.mrn, p.dob, p.allergies,
       d.name as doctor_name FROM prescriptions pr
       JOIN patients p ON pr.patient_id=p.id JOIN doctors d ON pr.doctor_id=d.id WHERE pr.id=?`,
      [req.params.id]
    );
    if (!pres) return res.status(404).json({ error: 'Prescription not found' });
    try { pres.items = typeof pres.items === 'string' ? JSON.parse(pres.items||'[]') : (pres.items||[]); } catch(_) {}
    res.json(pres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pharmacy/prescriptions
router.post('/prescriptions', async (req, res) => {
  try {
    const { patient_id, doctor_id, medical_record_id, items, notes } = req.body;
    if (!patient_id || !doctor_id || !items) return res.status(400).json({ error: 'Required fields missing' });
    const r = await run(
      `INSERT INTO prescriptions (patient_id,doctor_id,medical_record_id,items,notes) VALUES (?,?,?,?,?)`,
      [patient_id, doctor_id, medical_record_id||null, JSON.stringify(items), notes]
    );
    res.status(201).json(await queryOne('SELECT * FROM prescriptions WHERE id=?', [r.lastId]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pharmacy/prescriptions/:id/dispense
router.put('/prescriptions/:id/dispense', async (req, res) => {
  try {
    const pres = await queryOne('SELECT * FROM prescriptions WHERE id=?', [req.params.id]);
    if (!pres) return res.status(404).json({ error: 'Prescription not found' });
    if (pres.status === 'dispensed') return res.status(400).json({ error: 'Already dispensed' });

    const items = typeof pres.items === 'string' ? JSON.parse(pres.items||'[]') : (pres.items||[]);
    for (const item of items) {
      if (item.medicine_id) {
        const med = await queryOne('SELECT stock_qty FROM medicines WHERE id=?', [item.medicine_id]);
        if (med) {
          const newQty = Math.max(0, med.stock_qty - (item.quantity || 1));
          await run('UPDATE medicines SET stock_qty=? WHERE id=?', [newQty, item.medicine_id]);
        }
      }
    }

    await run(
      `UPDATE prescriptions SET status='dispensed', dispensed_by=?, dispensed_at=NOW() WHERE id=?`,
      [req.user.id, req.params.id]
    );
    res.json(await queryOne('SELECT * FROM prescriptions WHERE id=?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
