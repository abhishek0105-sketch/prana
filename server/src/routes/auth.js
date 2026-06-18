const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const rateLimit = require('express-rate-limit');
const db       = require('../db');
const auth     = require('../middleware/auth');

// Resend email client — only initialised when RESEND_API_KEY is set
let resend = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resend = new Resend(process.env.RESEND_API_KEY);
}

const COLORS = ['#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#EC4899'];

// ── Rate limiters ──────────────────────────────────────────────
// 600 per 15 min — temporarily elevated for QA load test; will be restored to 40
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
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

  if (await db.findOne('users', u => u.email === cleanEmail))
    return res.status(409).json({ error: 'An account with that email already exists' });

  const id    = uuid();
  const colorIdx = id.replace(/-/g, '').split('').reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length;
  const color = COLORS[colorIdx];

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = {
    id, name: name.trim(), email: cleanEmail,
    password: hashedPassword, avatar_color: color,
    city: '', created_at: Date.now(),
  };
  await db.insert('users', user);

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
router.post('/login', authLimiter, async (req, res) => {
  const validationError = validateLogin(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const user = await db.findOne('users', u => u.email === cleanEmail);
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
router.get('/me', auth, async (req, res) => {
  const user = await db.findOne('users', u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// ── PATCH /city ────────────────────────────────────────────────
router.patch('/city', auth, async (req, res) => {
  const city = (req.body.city || '').toString().trim().slice(0, 100);
  await db.update('users', u => u.id === req.user.id, { city });
  res.json({ ok: true });
});

// ── POST /forgot-password ──────────────────────────────────────
router.post('/forgot-password', authLimiter, async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });

  const user = await db.findOne('users', u => u.email === email);
  if (!user) return res.json({ ok: true });

  await db.remove('reset_tokens', t => t.user_id === user.id);

  const token      = uuid();
  const expires_at = Date.now() + 60 * 60 * 1000;
  await db.insert('reset_tokens', { id: token, token, user_id: user.id, expires_at });

  const resetUrl = `${process.env.FRONTEND_URL || 'https://clink-social.vercel.app'}/reset-password?token=${token}`;
  const from     = process.env.FROM_EMAIL || 'CLINK <onboarding@resend.dev>';

  if (resend) {
    await resend.emails.send({
      from,
      to: user.email,
      subject: 'Reset your CLINK password',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#020C18;color:#fff;border-radius:16px">
          <h1 style="font-size:1.8rem;font-weight:900;margin:0 0 8px">Hey ${user.name} 👋</h1>
          <p style="color:rgba(255,255,255,0.7);margin:0 0 28px">Someone requested a password reset for your CLINK account. If that was you, click below.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00B4FF,#00E5A0);color:#020C18;font-weight:900;font-size:1rem;border-radius:14px;text-decoration:none">Reset my password</a>
          <p style="color:rgba(255,255,255,0.38);font-size:0.8rem;margin-top:28px">Link expires in 1 hour. If you didn't request this, ignore this email — your account is safe.</p>
        </div>
      `,
    });
  } else {
    console.log(`[dev] Password reset link for ${email}: ${resetUrl}`);
  }

  res.json({ ok: true });
});

// ── POST /reset-password ───────────────────────────────────────
router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
  if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (password.length > 128) return res.status(400).json({ error: 'Password is too long' });

  const record = await db.findOne('reset_tokens', t => t.token === token);
  if (!record || record.expires_at < Date.now())
    return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });

  const hashed = await bcrypt.hash(password, 12);
  await db.update('users', u => u.id === record.user_id, { password: hashed });
  await db.remove('reset_tokens', t => t.token === token);

  res.json({ ok: true });
});

module.exports = router;
