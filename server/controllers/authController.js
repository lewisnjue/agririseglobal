const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const pool = require('../config/db');

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const generateSecurePassword = () => randomBytes(16).toString('hex');

const getSetupStatus = async (req, res) => {
  try {
    const existing = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    res.json({ isSetup: existing.rows.length > 0 });
  } catch (err) {
    console.error('Setup status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (!normalizedEmail || !normalizedName) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const setupToken = process.env.SETUP_TOKEN;
    if (setupToken) {
      const providedToken = typeof req.body.setupToken === 'string' ? req.body.setupToken : '';
      if (!providedToken || providedToken !== setupToken) {
        return res.status(403).json({ error: 'Invalid setup token' });
      }
    }

    const existing = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (existing.rows.length > 0) {
      return res.status(403).json({ error: 'Admin account already exists. Only administrators can create accounts.' });
    }

    const finalPassword = (typeof password === 'string' && password.trim()) ? password : generateSecurePassword();
    if (finalPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(finalPassword, 12);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin') RETURNING id, email, name, role, created_at",
      [normalizedEmail, passwordHash, normalizedName]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Ensure role is set (default to 'author' if null for legacy users)
    const userRole = user.role || 'author';
    
    // If user has no role and is the first user, set as admin
    if (!user.role) {
      const firstUser = await pool.query('SELECT MIN(id) as first_id FROM users');
      if (firstUser.rows[0].first_id === user.id) {
        await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
        user.role = 'admin';
      } else {
        await pool.query("UPDATE users SET role = 'author' WHERE id = $1", [user.id]);
        user.role = 'author';
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, profile_image: user.profile_image, bio: user.bio, location: user.location },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Server error during login. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
};

const me = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, profile_image, bio, location, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, profile_image, bio, location } = req.body;
    const result = await pool.query(
      'UPDATE users SET name = COALESCE(NULLIF($1, \'\'), name), profile_image = $2, bio = $3, location = $4 WHERE id = $5 RETURNING id, email, name, role, profile_image, bio, location, created_at',
      [name?.trim(), profile_image || null, bio || '', location?.trim() || null, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, profile_image, bio, location, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin only: create user account (author role)
const createUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const finalPassword = password || generateSecurePassword();
    if (finalPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(finalPassword, 12);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'author') RETURNING id, email, name, role, created_at",
      [email, passwordHash, name]
    );

    res.status(201).json({ 
      user: result.rows[0],
      message: 'User account created successfully. Send these credentials to the user.',
      credentials: {
        email: result.rows[0].email,
        password: finalPassword,
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

// Admin only: list all users
const listUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, profile_image, bio, location, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin only: update a user's profile, role, or password
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, role, password } = req.body;
    const existing = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const current = existing.rows[0];
    const nextEmail = email?.trim() || current.email;
    const nextName = name?.trim() || current.name;
    const nextRole = role === 'admin' || role === 'author' ? role : current.role;

    if (Number(id) === Number(req.user.id) && nextRole !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove your own admin role' });
    }

    if (current.role === 'admin' && nextRole !== 'admin') {
      const admins = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'");
      if (admins.rows[0].count <= 1) return res.status(400).json({ error: 'At least one admin account must remain' });
    }

    let result;
    if (password?.trim()) {
      const passwordHash = await bcrypt.hash(password, 12);
      result = await pool.query(
        'UPDATE users SET email = $1, name = $2, role = $3, password_hash = $4 WHERE id = $5 RETURNING id, email, name, role, created_at',
        [nextEmail, nextName, nextRole, passwordHash, id]
      );
    } else {
      result = await pool.query(
        'UPDATE users SET email = $1, name = $2, role = $3 WHERE id = $4 RETURNING id, email, name, role, created_at',
        [nextEmail, nextName, nextRole, id]
      );
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin only: delete a user, but never the current admin or the last admin
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const existing = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (existing.rows[0].role === 'admin') {
      const admins = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'");
      if (admins.rows[0].count <= 1) return res.status(400).json({ error: 'The last admin account cannot be deleted' });
    }

    await pool.query('UPDATE posts SET user_id = $1 WHERE user_id = $2', [req.user.id, id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, me, updateProfile, getPublicProfile, createUser, listUsers, updateUser, deleteUser, getSetupStatus };
