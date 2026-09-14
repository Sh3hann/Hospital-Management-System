// ================================================================
// backend/routes/users.js
// ================================================================
const express  = require('express');
const bcrypt   = require('bcryptjs');
const { query, queryOne, run, transaction } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await query(
      `SELECT u.id, u.username, u.full_name, u.email, r.name as role, u.active as is_active, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.id ASC`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT u.id, u.username, u.full_name, u.email, r.name as role, u.active as is_active, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    if (!username || !password || !full_name || !role)
      return res.status(400).json({ error: 'Missing required fields' });

    const existing = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    let roleName = role;
    if (roleName === 'lab_staff') roleName = 'lab_tech';
    const roleObj = await queryOne('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (!roleObj)  return res.status(400).json({ error: `Invalid role: ${role}` });

    const hash   = bcrypt.hashSync(password, 10);
    const result = await run(
      'INSERT INTO users (username,password_hash,role_id,full_name,email) VALUES (?,?,?,?,?)',
      [username, hash, roleObj.id, full_name, email||'']
    );
    res.status(201).json({ id: result.lastId, message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/change-password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Current and new password required' });

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || !bcrypt.compareSync(current_password, user.password_hash))
      return res.status(400).json({ error: 'Incorrect current password' });

    const newHash = bcrypt.hashSync(new_password, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { full_name, email, role, is_active, password } = req.body;
    const userId = req.params.id;

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let roleId = user.role_id;
    if (role) {
      let roleName = role;
      if (roleName === 'lab_staff') roleName = 'lab_tech';
      const roleObj = await queryOne('SELECT id FROM roles WHERE name = ?', [roleName]);
      if (roleObj) roleId = roleObj.id;
    }

    await run(
      'UPDATE users SET full_name=?, email=?, role_id=?, active=? WHERE id=?',
      [full_name||user.full_name, email??user.email, roleId, is_active??user.active, userId]
    );
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await run('UPDATE users SET password_hash=? WHERE id=?', [hash, userId]);
    }
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Delete or deactivate user (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete or deactivate your own account' });
    }

    const { permanent } = req.query;

    if (permanent === 'true') {
      await transaction(async (conn) => {
        // Clear or unassign doctor / employee references before deleting user
        await conn.execute('DELETE FROM attendance WHERE employee_id IN (SELECT id FROM employees WHERE user_id = ?)', [userId]);
        await conn.execute('DELETE FROM leave_requests WHERE employee_id IN (SELECT id FROM employees WHERE user_id = ?)', [userId]);
        await conn.execute('DELETE FROM employees WHERE user_id = ?', [userId]);
        await conn.execute('UPDATE doctors SET user_id = NULL WHERE user_id = ?', [userId]);
        await conn.execute('DELETE FROM audit_logs WHERE user_id = ?', [userId]);
        await conn.execute('DELETE FROM users WHERE id = ?', [userId]);
      });
      res.json({ message: 'User account permanently deleted successfully' });
    } else {
      await run('UPDATE users SET active=0 WHERE id=?', [userId]);
      res.json({ message: 'User deactivated successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
