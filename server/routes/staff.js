const express = require('express');
const { query, queryOne, run } = require('../db/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/departments
router.get('/departments', (req, res) => {
  const depts = query(
    `SELECT d.*, COUNT(doc.id) as doctor_count FROM departments d
     LEFT JOIN doctors doc ON doc.department_id = d.id AND doc.active=1
     GROUP BY d.id ORDER BY d.name`
  );
  res.json(depts);
});

// POST /api/departments
router.post('/departments', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const r = run('INSERT INTO departments (name,description) VALUES (?,?)', [name, description]);
  res.status(201).json(queryOne('SELECT * FROM departments WHERE id=?', [r.lastId]));
});

// GET /api/staff/employees
router.get('/employees', (req, res) => {
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
  if (role) { sql += ` AND e.role=?`; params.push(role); }
  sql += ` ORDER BY e.name LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  const employees = query(sql, params);
  const { total } = queryOne('SELECT COUNT(*) as total FROM employees WHERE active=1');
  res.json({ data: employees, total });
});

// GET /api/staff/employees/:id
router.get('/employees/:id', (req, res) => {
  const emp = queryOne(
    `SELECT e.*, d.name as department_name FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id WHERE e.id=? AND e.active=1`,
    [req.params.id]
  );
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  emp.attendance = query('SELECT * FROM attendance WHERE employee_id=? ORDER BY date DESC LIMIT 30', [emp.id]);
  emp.leave_requests = query('SELECT * FROM leave_requests WHERE employee_id=? ORDER BY created_at DESC LIMIT 10', [emp.id]);
  res.json(emp);
});

// POST /api/staff/employees
router.post('/employees', (req, res) => {
  const { name, role, department_id, phone, email, address, dob, gender, join_date, salary } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Name and role required' });
  const r = run(
    `INSERT INTO employees (name,role,department_id,phone,email,address,dob,gender,join_date,salary)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [name, role, department_id, phone, email, address, dob, gender, join_date, salary || 0]
  );
  res.status(201).json(queryOne('SELECT * FROM employees WHERE id=?', [r.lastId]));
});

// PUT /api/staff/employees/:id
router.put('/employees/:id', (req, res) => {
  const { name, role, department_id, phone, email, address, dob, gender, join_date, salary } = req.body;
  run(`UPDATE employees SET name=?,role=?,department_id=?,phone=?,email=?,address=?,dob=?,gender=?,join_date=?,salary=? WHERE id=?`,
    [name, role, department_id, phone, email, address, dob, gender, join_date, salary, req.params.id]);
  res.json(queryOne('SELECT * FROM employees WHERE id=?', [req.params.id]));
});

// DELETE /api/staff/employees/:id
router.delete('/employees/:id', (req, res) => {
  run('UPDATE employees SET active=0 WHERE id=?', [req.params.id]);
  res.json({ message: 'Employee removed' });
});

// POST /api/staff/attendance
router.post('/attendance', (req, res) => {
  const { employee_id, date, status, check_in, check_out, notes } = req.body;
  if (!employee_id || !date) return res.status(400).json({ error: 'Employee and date required' });
  try {
    run(`INSERT OR REPLACE INTO attendance (employee_id,date,status,check_in,check_out,notes)
         VALUES (?,?,?,?,?,?)`,
      [employee_id, date, status || 'present', check_in, check_out, notes]);
    res.json({ message: 'Attendance recorded' });
  } catch(e) {
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// GET /api/staff/attendance/:employee_id
router.get('/attendance/:employee_id', (req, res) => {
  const { month, year } = req.query;
  let sql = 'SELECT * FROM attendance WHERE employee_id=?';
  const params = [req.params.employee_id];
  if (month && year) {
    sql += ` AND date LIKE '${year}-${String(month).padStart(2,'0')}-%'`;
  }
  sql += ' ORDER BY date DESC';
  res.json(query(sql, params));
});

// POST /api/staff/leave
router.post('/leave', (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body;
  if (!employee_id || !start_date || !end_date) return res.status(400).json({ error: 'Required fields missing' });
  const r = run(
    `INSERT INTO leave_requests (employee_id,leave_type,start_date,end_date,reason) VALUES (?,?,?,?,?)`,
    [employee_id, leave_type || 'annual', start_date, end_date, reason]
  );
  res.status(201).json(queryOne('SELECT * FROM leave_requests WHERE id=?', [r.lastId]));
});

// PUT /api/staff/leave/:id
router.put('/leave/:id', (req, res) => {
  const { status } = req.body;
  run('UPDATE leave_requests SET status=?, approved_by=? WHERE id=?', [status, req.user.id, req.params.id]);
  res.json(queryOne('SELECT * FROM leave_requests WHERE id=?', [req.params.id]));
});

module.exports = router;
