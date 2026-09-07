const express = require('express');
const { query, queryOne, run } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── MEDICINES ──────────────────────────────────────

// GET /api/pharmacy/medicines
router.get('/medicines', (req, res) => {
  const { search, category, low_stock, near_expiry, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let sql = `SELECT * FROM medicines WHERE active=1`;
  const params = [];
  if (search) {
    sql += ` AND (name LIKE ? OR generic_name LIKE ? OR batch_number LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) { sql += ` AND category=?`; params.push(category); }
  if (low_stock === 'true') sql += ` AND stock_qty <= reorder_level`;
  if (near_expiry === 'true') {
    const limit30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    sql += ` AND expiry_date <= '${limit30}'`;
  }
  sql += ` ORDER BY name LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  const medicines = query(sql, params);
  const today = new Date().toISOString().split('T')[0];
  const limit30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const total = queryOne('SELECT COUNT(*) as c FROM medicines WHERE active=1').c;
  const low_stock_count = queryOne('SELECT COUNT(*) as c FROM medicines WHERE active=1 AND stock_qty <= reorder_level').c;
  const expiring_count = queryOne(`SELECT COUNT(*) as c FROM medicines WHERE active=1 AND expiry_date <= '${limit30}'`).c;
  res.json({ data: medicines, total, low_stock_count, expiring_count });
});

// GET /api/pharmacy/medicines/:id
router.get('/medicines/:id', (req, res) => {
  const med = queryOne('SELECT * FROM medicines WHERE id=? AND active=1', [req.params.id]);
  if (!med) return res.status(404).json({ error: 'Medicine not found' });
  res.json(med);
});

// POST /api/pharmacy/medicines
router.post('/medicines', (req, res) => {
  const { name, generic_name, category, dosage_form, strength, manufacturer, stock_qty,
    unit_price, reorder_level, expiry_date, batch_number } = req.body;
  if (!name) return res.status(400).json({ error: 'Medicine name required' });
  const r = run(
    `INSERT INTO medicines (name,generic_name,category,dosage_form,strength,manufacturer,stock_qty,
     unit_price,reorder_level,expiry_date,batch_number) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [name, generic_name, category, dosage_form, strength, manufacturer, stock_qty || 0,
     unit_price || 0, reorder_level || 10, expiry_date, batch_number]
  );
  res.status(201).json(queryOne('SELECT * FROM medicines WHERE id=?', [r.lastId]));
});

// PUT /api/pharmacy/medicines/:id
router.put('/medicines/:id', (req, res) => {
  const { name, generic_name, category, dosage_form, strength, manufacturer, stock_qty,
    unit_price, reorder_level, expiry_date, batch_number } = req.body;
  run(`UPDATE medicines SET name=?,generic_name=?,category=?,dosage_form=?,strength=?,
    manufacturer=?,stock_qty=?,unit_price=?,reorder_level=?,expiry_date=?,batch_number=? WHERE id=?`,
    [name, generic_name, category, dosage_form, strength, manufacturer, stock_qty,
     unit_price, reorder_level, expiry_date, batch_number, req.params.id]
  );
  res.json(queryOne('SELECT * FROM medicines WHERE id=?', [req.params.id]));
});

// PATCH /api/pharmacy/medicines/:id/stock
router.patch('/medicines/:id/stock', (req, res) => {
  const { adjustment, type } = req.body; // type: 'add' | 'subtract'
  const med = queryOne('SELECT * FROM medicines WHERE id=?', [req.params.id]);
  if (!med) return res.status(404).json({ error: 'Medicine not found' });
  const newQty = type === 'subtract' ? med.stock_qty - adjustment : med.stock_qty + adjustment;
  if (newQty < 0) return res.status(400).json({ error: 'Insufficient stock' });
  run('UPDATE medicines SET stock_qty=? WHERE id=?', [newQty, req.params.id]);
  res.json({ ...med, stock_qty: newQty });
});

// ─── PRESCRIPTIONS ──────────────────────────────────

// GET /api/pharmacy/prescriptions
router.get('/prescriptions', (req, res) => {
  const { patient_id, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let sql = `SELECT pr.*, p.first_name, p.last_name, p.mrn, d.name as doctor_name
    FROM prescriptions pr JOIN patients p ON pr.patient_id=p.id JOIN doctors d ON pr.doctor_id=d.id WHERE 1=1`;
  const params = [];
  if (patient_id) { sql += ` AND pr.patient_id=?`; params.push(patient_id); }
  if (status) { sql += ` AND pr.status=?`; params.push(status); }
  sql += ` ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  const prescriptions = query(sql, params);
  res.json({ data: prescriptions });
});

// GET /api/pharmacy/prescriptions/:id
router.get('/prescriptions/:id', (req, res) => {
  const pres = queryOne(
    `SELECT pr.*, p.first_name, p.last_name, p.mrn, p.dob, p.allergies,
     d.name as doctor_name FROM prescriptions pr
     JOIN patients p ON pr.patient_id=p.id JOIN doctors d ON pr.doctor_id=d.id WHERE pr.id=?`,
    [req.params.id]
  );
  if (!pres) return res.status(404).json({ error: 'Prescription not found' });
  try { pres.items = JSON.parse(pres.items || '[]'); } catch(e) {}
  res.json(pres);
});

// POST /api/pharmacy/prescriptions
router.post('/prescriptions', (req, res) => {
  const { patient_id, doctor_id, medical_record_id, items, notes } = req.body;
  if (!patient_id || !doctor_id || !items) return res.status(400).json({ error: 'Required fields missing' });
  const r = run(
    `INSERT INTO prescriptions (patient_id,doctor_id,medical_record_id,items,notes)
     VALUES (?,?,?,?,?)`,
    [patient_id, doctor_id, medical_record_id, JSON.stringify(items), notes]
  );
  res.status(201).json(queryOne('SELECT * FROM prescriptions WHERE id=?', [r.lastId]));
});

// PUT /api/pharmacy/prescriptions/:id/dispense
router.put('/prescriptions/:id/dispense', (req, res) => {
  const pres = queryOne('SELECT * FROM prescriptions WHERE id=?', [req.params.id]);
  if (!pres) return res.status(404).json({ error: 'Prescription not found' });
  if (pres.status === 'dispensed') return res.status(400).json({ error: 'Already dispensed' });

  // Deduct stock for each medicine
  const items = JSON.parse(pres.items || '[]');
  for (const item of items) {
    if (item.medicine_id) {
      const med = queryOne('SELECT stock_qty FROM medicines WHERE id=?', [item.medicine_id]);
      if (med) {
        const newQty = Math.max(0, med.stock_qty - (item.quantity || 1));
        run('UPDATE medicines SET stock_qty=? WHERE id=?', [newQty, item.medicine_id]);
      }
    }
  }

  run(`UPDATE prescriptions SET status='dispensed', dispensed_by=?, dispensed_at=datetime('now') WHERE id=?`,
    [req.user.id, req.params.id]);
  res.json(queryOne('SELECT * FROM prescriptions WHERE id=?', [req.params.id]));
});

module.exports = router;
