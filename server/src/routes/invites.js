const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const db       = require('../db');
const auth     = require('../middleware/auth');
const { userSockets } = require('../socketState');

// 8-char alphanumeric code
const randomCode = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars (0/O, 1/l/I)
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const safeUser = (u) => u
  ? { id: u.id, name: u.name, avatar_color: u.avatar_color }
  : null;

// ── POST /api/invites ──────────────────────────────────────────
// Create (or return existing unused) invite for the logged-in user
router.post('/', auth, (req, res) => {
  const inviterId = req.user.id;

  // Re-use any existing unused invite
  const existing = db.findOne('invites', i => i.inviter_id === inviterId && !i.used);
  if (existing) return res.json({ code: existing.code });

  const code = randomCode();
  db.insert('invites', {
    code,
    inviter_id:  inviterId,
    used:        false,
    created_at:  Date.now(),
  });
  res.json({ code });
});

// ── GET /api/invites/:code ─────────────────────────────────────
// Public — returns inviter info so the landing page can render without login
router.get('/:code', (req, res) => {
  const invite = db.findOne('invites', i => i.code === req.params.code);
  if (!invite)       return res.status(404).json({ error: 'Invite link not found' });
  if (invite.used)   return res.status(410).json({ error: 'This invite has already been used' });

  const inviter = db.findOne('users', u => u.id === invite.inviter_id);
  if (!inviter)      return res.status(404).json({ error: 'Inviter not found' });

  res.json({ inviter: safeUser(inviter) });
});

// ── POST /api/invites/:code/redeem ────────────────────────────
// Auth required — called after signup (or by an existing user who opened the link)
router.post('/:code/redeem', auth, (req, res) => {
  const invite = db.findOne('invites', i => i.code === req.params.code);
  if (!invite)     return res.status(404).json({ error: 'Invite link not found' });
  if (invite.used) return res.status(410).json({ error: 'This invite has already been used' });

  const inviterId = invite.inviter_id;
  const newUserId = req.user.id;

  if (inviterId === newUserId)
    return res.status(400).json({ error: 'Cannot redeem your own invite' });

  // Create friendship (accepted immediately — no pending step)
  const alreadyFriends = db.findOne('friendships', f =>
    (f.requester_id === inviterId && f.addressee_id === newUserId) ||
    (f.requester_id === newUserId && f.addressee_id === inviterId)
  );

  if (!alreadyFriends) {
    db.insert('friendships', {
      id:           uuid(),
      requester_id: inviterId,
      addressee_id: newUserId,
      status:       'accepted',
      created_at:   Date.now(),
    });
  }

  // Mark invite as used
  db.update('invites', i => i.code === req.params.code, {
    used:         true,
    redeemed_by:  newUserId,
    redeemed_at:  Date.now(),
  });

  // Ping the inviter in real time if they're online
  const sid = userSockets[inviterId];
  if (sid) req.io.to(sid).emit('friend-accepted', { name: req.user.name, email: req.user.email });

  res.json({ ok: true });
});

module.exports = router;
