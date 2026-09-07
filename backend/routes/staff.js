// ================================================================
// backend/routes/staff.js
// ================================================================
const express = require('express');
const { query, queryOne, run, transaction } = require('../config/db');
const { authenticateToken, requireRole }    = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/staff/departments
router.get('/departments', async (req, res) => {
  try {
    const depts = await query(
      `SELECT d.*, COUNT(doc.id) as doctor_count FROM departments d
       LEFT JOIN doctors doc ON doc.department_id = d.id AND doc.active=1
       GROUP BY d.id ORDER BY d.name`
    );
    res.json(depts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/departments
router.post('/departments', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const r = await run('INSERT INTO departments (name,description) VALUES (?,?)', [name, description]);
    res.status(201).json(await queryOne('SELECT * FROM departments WHERE id=?', [r.lastId]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/staff/employees
router.get('/employees', async (req, res) => {
  try {
    const { search, department_id, role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT e.*, d.name as department_name FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id WHERE e.active=1`;
    const params = [];
    if (search) {
      sql += ` AND (e.name LIKE ? OR e.email LIKE ? OR e.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (department_id) { sql += ` AND e.department_id=?`; params.push(department_id); }
    if (role)          { sql += ` AND e.role=?`;          params.push(role); }
    sql += ` ORDER BY e.name LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    const employees = await query(sql, params);
    const countRow  = await queryOne('SELECT COUNT(*) as total FROM employees WHERE active=1');
    res.json({ data: employees, total: countRow?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/staff/employees/:id
router.get('/employees/:id', async (req, res) => {
  try {
    const emp = await queryOne(
      `SELECT e.*, d.name as department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id WHERE e.id=? AND e.active=1`,
      [req.params.id]
    );
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    const [attendance, leave_requests] = await Promise.all([
      query('SELECT * FROM attendance WHERE employee_id=? ORDER BY date DESC LIMIT 30', [emp.id]),
      query('SELECT * FROM leave_requests WHERE employee_id=? ORDER BY created_at DESC LIMIT 10', [emp.id]),
    ]);
    emp.attendance     = attendance;
    emp.leave_requests = leave_requests;
    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/employees
router.post('/employees', async (req, res) => {
  try {
    const { name, role, department_id, phone, email, address, dob, gender, join_date, salary } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Name and role required' });
    const r = await run(
      `INSERT INTO employees (name,role,department_id,phone,email,address,dob,gender,join_date,salary)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [name, role, department_id||null, phone, email, address, dob||null, gender, join_date||null, salary||0]
    );
    res.status(201).json(await queryOne('SELECT * FROM employees WHERE id=?', [r.lastId]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/staff/employees/:id
router.put('/employees/:id', async (req, res) => {
  try {
    const { name, role, department_id, phone, email, address, dob, gender, join_date, salary } = req.body;
    await run(
      `UPDATE employees SET name=?,role=?,department_id=?,phone=?,email=?,address=?,dob=?,gender=?,join_date=?,salary=? WHERE id=?`,
      [name, role, department_id||null, phone, email, address, dob||null, gender, join_date||null, salary, req.params.id]
    );
    res.json(await queryOne('SELECT * FROM employees WHERE id=?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/staff/employees/:id
router.delete('/employees/:id', requireRole('admin'), async (req, res) => {
  try {
    const empId = parseInt(req.params.id);
    const { permanent } = req.query;

    if (permanent === 'true') {
      await transaction(async (conn) => {
        await conn.execute('DELETE FROM attendance WHERE employee_id = ?', [empId]);
        await conn.execute('DELETE FROM leave_requests WHERE employee_id = ?', [empId]);
        await conn.execute('DELETE FROM employees WHERE id = ?', [empId]);
      });
      res.json({ message: 'Employee record permanently deleted' });
    } else {
      await run('UPDATE employees SET active=0 WHERE id=?', [empId]);
      res.json({ message: 'Employee deactivated successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/attendance
router.post('/attendance', async (req, res) => {
  try {
    const { employee_id, date, status, check_in, check_out, notes } = req.body;
    if (!employee_id || !date) return res.status(400).json({ error: 'Employee and date required' });
    // INSERT ... ON DUPLICATE KEY UPDATE replaces SQLite's INSERT OR REPLACE
    await run(
      `INSERT INTO attendance (employee_id,date,status,check_in,check_out,notes)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE status=VALUES(status),check_in=VALUES(check_in),
         check_out=VALUES(check_out),notes=VALUES(notes)`,
      [employee_id, date, status||'present', check_in||null, check_out||null, notes]
    );
    res.json({ message: 'Attendance recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/staff/attendance/:employee_id
router.get('/attendance/:employee_id', async (req, res) => {
  try {
    const { month, year } = req.query;
    let sql = 'SELECT * FROM attendance WHERE employee_id=?';
    const params = [req.params.employee_id];
    if (month && year) {
      sql += ` AND date LIKE '${year}-${String(month).padStart(2,'0')}-%'`;
    }
    sql += ' ORDER BY date DESC';
    res.json(await query(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/leave
router.post('/leave', async (req, res) => {
  try {
    const { employee_id, leave_type, start_date, end_date, reason } = req.body;
    if (!employee_id || !start_date || !end_date) return res.status(400).json({ error: 'Required fields missing' });
    const r = await run(
      `INSERT INTO leave_requests (employee_id,leave_type,start_date,end_date,reason) VALUES (?,?,?,?,?)`,
      [employee_id, leave_type||'annual', start_date, end_date, reason]
    );
    res.status(201).json(await queryOne('SELECT * FROM leave_requests WHERE id=?', [r.lastId]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/staff/leave/:id
router.put('/leave/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await run('UPDATE leave_requests SET status=?, approved_by=? WHERE id=?', [status, req.user.id, req.params.id]);
    res.json(await queryOne('SELECT * FROM leave_requests WHERE id=?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
