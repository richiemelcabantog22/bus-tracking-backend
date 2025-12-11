const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, publicUser } = require('./userStore');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = '7d';

// Helper to sign token
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, passwordHash });
    const token = signToken(user);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (e) {
    console.error('Signup error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
