const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const db       = require('../db');
const auth     = require('../middleware/auth');
const { userSockets } = require('../socketState');

const randomCode = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const safeUser = (u) => u
  ? { id: u.id, name: u.name, avatar_color: u.avatar_color }
  : null;

// ── POST /api/invites ──────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const inviterId = req.user.id;
  const existing = await db.findOne('invites', i => i.inviter_id === inviterId && !i.used);
  if (existing) return res.json({ code: existing.code });

  const code = randomCode();
  await db.insert('invites', {
    id: code, code, inviter_id: inviterId,
    used: false, created_at: Date.now(),
  });
  res.json({ code });
});

// ── GET /api/invites/:code ─────────────────────────────────────
router.get('/:code', async (req, res) => {
  const invite = await db.findOne('invites', i => i.code === req.params.code);
  if (!invite)     return res.status(404).json({ error: 'Invite link not found' });
  if (invite.used) return res.status(410).json({ error: 'This invite has already been used' });

  const inviter = await db.findOne('users', u => u.id === invite.inviter_id);
  if (!inviter)    return res.status(404).json({ error: 'Inviter not found' });

  res.json({ inviter: safeUser(inviter) });
});

// ── POST /api/invites/:code/redeem ─────────────────────────────
router.post('/:code/redeem', auth, async (req, res) => {
  const invite = await db.findOne('invites', i => i.code === req.params.code);
  if (!invite)     return res.status(404).json({ error: 'Invite link not found' });
  if (invite.used) return res.status(410).json({ error: 'This invite has already been used' });

  const inviterId = invite.inviter_id;
  const newUserId = req.user.id;

  if (inviterId === newUserId)
    return res.status(400).json({ error: 'Cannot redeem your own invite' });

  const alreadyFriends = await db.findOne('friendships', f =>
    (f.requester_id === inviterId && f.addressee_id === newUserId) ||
    (f.requester_id === newUserId && f.addressee_id === inviterId)
  );

  if (!alreadyFriends) {
    await db.insert('friendships', {
      id: uuid(), requester_id: inviterId, addressee_id: newUserId,
      status: 'accepted', created_at: Date.now(),
    });
  }

  await db.update('invites', i => i.code === req.params.code, {
    used: true, redeemed_by: newUserId, redeemed_at: Date.now(),
  });

  const sid = userSockets[inviterId];
  if (sid) req.io.to(sid).emit('friend-accepted', { name: req.user.name, email: req.user.email });

  res.json({ ok: true });
});

module.exports = router;
