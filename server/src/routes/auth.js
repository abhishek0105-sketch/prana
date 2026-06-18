const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const rateLimit = require('express-rate-limit');
const db       = require('../db');
const auth     = require('../middleware/auth');

const COLORS = ['#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#EC4899'];

// ── Rate limiters ──────────────────────────────────────────────
// 40 attempts per 15 minutes per IP — stops brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — please wait 15 minutes and try again.' },
});

// ── Input helpers ──────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister({ name, email, password }) {
  if (!name || !email || !password)    return 'All fields are required';
  if (name.trim().length < 2)          return 'Name must be at least 2 characters';
  if (name.trim().length > 60)         return 'Name is too long';
  if (!EMAIL_RE.test(email))           return 'Enter a valid email address';
  if (email.length > 120)              return 'Email is too long';
  if (password.length < 8)             return 'Password must be at least 8 characters';
  if (password.length > 128)           return 'Password is too long';
  return null;
}

function validateLogin({ email, password }) {
  if (!email || !password) return 'Email and password are required';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address';
  return null;
}

// ── POST /register ─────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  const validationError = validateRegister(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { name, email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  if (db.findOne('users', u => u.email === cleanEmail))
    return res.status(409).json({ error: 'An account with that email already exists' });

  const id    = uuid();
  // Deterministic color from UUID so no two users created in rapid succession get the same color.
  const colorIdx = id.replace(/-/g, '').split('').reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length;
  const color = COLORS[colorIdx];

  // Async hash — doesn't block the event loop (cost 12 ≈ 400ms blocking if sync)
  const hashedPassword = await bcrypt.hash(password, 12);

  const user  = {
    id,
    name:         name.trim(),
    email:        cleanEmail,
    password:     hashedPassword,
    avatar_color: color,
    city:         '',
    created_at:   Date.now(),
  };
  db.insert('users', user);

  const token = jwt.sign(
    { id, name: user.name, email: user.email, avatar_color: color },
    process.env.JWT_SECRET,
    { expiresIn: '14d' }
  );
  res.status(201).json({
    token,
    user: { id, name: user.name, email: user.email, avatar_color: color, city: '' },
  });
});

// ── POST /login ────────────────────────────────────────────────
router.post('/login', authLimiter, (req, res) => {
  const validationError = validateLogin(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const user = db.findOne('users', u => u.email === cleanEmail);
  // Always run compareSync even on missing user to prevent timing attacks
  const passwordMatch = user && bcrypt.compareSync(password, user.password);
  if (!user || !passwordMatch)
    return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color },
    process.env.JWT_SECRET,
    { expiresIn: '14d' }
  );
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color, city: user.city },
  });
});

// ── GET /me ────────────────────────────────────────────────────
router.get('/me', auth, (req, res) => {
  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// ── PATCH /city ────────────────────────────────────────────────
router.patch('/city', auth, (req, res) => {
  const city = (req.body.city || '').toString().trim().slice(0, 100);
  db.update('users', u => u.id === req.user.id, { city });
  res.json({ ok: true });
});

module.exports = router;
