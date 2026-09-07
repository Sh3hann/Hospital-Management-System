// ================================================================
// backend/routes/billing.js
// ================================================================
const express = require('express');
const { query, queryOne, run } = require('../config/db');
const { authenticateToken }    = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/billing
router.get('/', async (req, res) => {
  try {
    const { patient_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT b.*, p.first_name, p.last_name, p.mrn,
      (SELECT SUM(amount) FROM payments WHERE bill_id=b.id) as paid_amount
      FROM bills b JOIN patients p ON b.patient_id=p.id WHERE 1=1`;
    const params = [];
    if (patient_id) { sql += ` AND b.patient_id=?`; params.push(patient_id); }
    if (status)     { sql += ` AND b.status=?`;     params.push(status); }
    sql += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    const bills    = await query(sql, params);
    const countRow = await queryOne('SELECT COUNT(*) as total FROM bills');
    res.json({ data: bills, total: countRow?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/:id
router.get('/:id', async (req, res) => {
  try {
    const bill = await queryOne(
      `SELECT b.*, p.first_name, p.last_name, p.mrn, p.phone, p.address, p.insurance_provider
       FROM bills b JOIN patients p ON b.patient_id=p.id WHERE b.id=?`,
      [req.params.id]
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    try { bill.items = typeof bill.items === 'string' ? JSON.parse(bill.items||'[]') : (bill.items||[]); } catch(_) {}
    bill.payments = await query('SELECT * FROM payments WHERE bill_id=? ORDER BY paid_at DESC', [bill.id]);
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing
router.post('/', async (req, res) => {
  try {
    const { patient_id, items, discount = 0, tax = 0, notes } = req.body;
    if (!patient_id || !items || !items.length)
      return res.status(400).json({ error: 'Patient and items required' });

    const subtotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);
    const total    = subtotal - discount + tax;

    const r = await run(
      `INSERT INTO bills (patient_id,items,subtotal,discount,tax,total,status,notes,created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [patient_id, JSON.stringify(items), subtotal, discount, tax, total, 'pending', notes, req.user.id]
    );
    await run(
      `INSERT INTO audit_logs (user_id,action,module,record_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id, 'CREATE', 'Billing', r.lastId, `Bill created for patient ${patient_id}`]
    );
    res.status(201).json(await queryOne(
      `SELECT b.*, p.first_name, p.last_name, p.mrn FROM bills b JOIN patients p ON b.patient_id=p.id WHERE b.id=?`,
      [r.lastId]
    ));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/billing/:id
router.put('/:id', async (req, res) => {
  try {
    const { items, discount, tax, status, notes } = req.body;
    const bill = await queryOne('SELECT * FROM bills WHERE id=?', [req.params.id]);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const existingItems = typeof bill.items === 'string' ? JSON.parse(bill.items) : (bill.items||[]);
    const newItems      = items || existingItems;
    const subtotal      = newItems.reduce((s, i) => s + (i.amount || 0), 0);
    const newDiscount   = discount !== undefined ? discount : bill.discount;
    const newTax        = tax !== undefined ? tax : bill.tax;
    const total         = subtotal - newDiscount + newTax;

    await run(
      `UPDATE bills SET items=?,subtotal=?,discount=?,tax=?,total=?,status=COALESCE(?,status),notes=COALESCE(?,notes) WHERE id=?`,
      [JSON.stringify(newItems), subtotal, newDiscount, newTax, total, status, notes, req.params.id]
    );
    res.json(await queryOne('SELECT * FROM bills WHERE id=?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/:id/payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, method, reference, notes } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount required' });

    const bill = await queryOne('SELECT * FROM bills WHERE id=?', [req.params.id]);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    await run(
      `INSERT INTO payments (bill_id,amount,method,reference,notes,received_by) VALUES (?,?,?,?,?,?)`,
      [req.params.id, amount, method||'cash', reference, notes, req.user.id]
    );

    const paidRow  = await queryOne('SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE bill_id=?', [req.params.id]);
    const totalPaid = paidRow?.total || 0;
    const newStatus = totalPaid >= bill.total ? 'paid' : 'partial';
    await run('UPDATE bills SET status=? WHERE id=?', [newStatus, req.params.id]);

    res.json({ message: 'Payment recorded', total_paid: totalPaid, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
