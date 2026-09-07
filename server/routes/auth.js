const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne, run } = require('../db/db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  const user = queryOne(
    `SELECT u.*, r.name as role, r.permissions FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.username = ? AND u.active = 1`,
    [username]
  );

  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });

  // Update last login
  run('UPDATE users SET last_login=datetime("now") WHERE id=?', [user.id]);

  // Audit log
  run(`INSERT INTO audit_logs (user_id,action,module,details) VALUES (?,?,?,?)`,
    [user.id, 'LOGIN', 'Auth', `User ${username} logged in`]);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.full_name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.full_name,
      email: user.email,
      role: user.role,
      permissions: JSON.parse(user.permissions || '[]'),
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      run(`INSERT INTO audit_logs (user_id,action,module,details) VALUES (?,?,?,?)`,
        [decoded.id, 'LOGOUT', 'Auth', `User ${decoded.username} logged out`]);
    } catch (e) {}
  }
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = queryOne(
      `SELECT u.id, u.username, u.full_name, u.email, r.name as role, r.permissions
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [decoded.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, permissions: JSON.parse(user.permissions || '[]') });
  } catch (e) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { current_password, new_password } = req.body;
    const user = queryOne('SELECT * FROM users WHERE id=?', [decoded.id]);
    if (!user || !bcrypt.compareSync(current_password, user.password_hash))
      return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = bcrypt.hashSync(new_password, 10);
    run('UPDATE users SET password_hash=? WHERE id=?', [hash, decoded.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (e) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

module.exports = router;
