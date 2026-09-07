const express = require('express');
const router = express.Router();
const { run, query, queryOne } = require('../db/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/users - List all users (admin only)
router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const users = query(`
      SELECT u.id, u.username, u.full_name, u.email, r.name as role, u.active as is_active, u.created_at 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id - Single user
router.get('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const user = queryOne(`
      SELECT u.id, u.username, u.full_name, u.email, r.name as role, u.active as is_active, u.created_at 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Create user (admin only)
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const roleObj = queryOne('SELECT id FROM roles WHERE name = ?', [role]);
    if (!roleObj) {
      return res.status(400).json({ error: `Invalid role: ${role}` });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = run(
      'INSERT INTO users (username, password_hash, role_id, full_name, email) VALUES (?, ?, ?, ?, ?)',
      [username, hash, roleObj.id, full_name, email || '']
    );

    res.status(201).json({ id: result.lastId, message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/change-password - Change own password
router.put('/change-password', authenticateToken, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { full_name, email, role, is_active, password } = req.body;
    const userId = req.params.id;

    let user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let roleId = user.role_id;
    if (role) {
      const roleObj = queryOne('SELECT id FROM roles WHERE name = ?', [role]);
      if (roleObj) roleId = roleObj.id;
    }

    run(
      'UPDATE users SET full_name = ?, email = ?, role_id = ?, active = ? WHERE id = ?',
      [full_name || user.full_name, email ?? user.email, roleId, is_active ?? user.active, userId]
    );

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Deactivate user (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const userId = req.params.id;
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    run('UPDATE users SET active = 0 WHERE id = ?', [userId]);
    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
