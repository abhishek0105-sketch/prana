const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db   = require('../db');
const auth = require('../middleware/auth');

// ── GET /api/push/vapid-public-key ────────────────────────────
router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

// ── POST /api/push/subscribe ──────────────────────────────────
router.post('/subscribe', auth, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint)
    return res.status(400).json({ error: 'subscription required' });

  const userId   = req.user.id;
  const endpoint = subscription.endpoint;

  await db.remove('push_subscriptions', s => s.user_id === userId && s.endpoint === endpoint);
  await db.insert('push_subscriptions', {
    id: uuid(), user_id: userId, endpoint, subscription, created_at: Date.now(),
  });

  res.json({ ok: true });
});

// ── DELETE /api/push/unsubscribe ──────────────────────────────
router.delete('/unsubscribe', auth, async (req, res) => {
  await db.remove('push_subscriptions', s => s.user_id === req.user.id);
  res.json({ ok: true });
});

module.exports = router;
