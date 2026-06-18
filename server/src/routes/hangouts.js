const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db   = require('../db');
const auth = require('../middleware/auth');

// Verify two users are actually accepted friends
const areFriends = (id1, id2) =>
  !!db.findOne('friendships', f =>
    f.status === 'accepted' &&
    ((f.requester_id === id1 && f.addressee_id === id2) ||
     (f.requester_id === id2 && f.addressee_id === id1))
  );

// ── POST /hangouts/start ───────────────────────────────────────
router.post('/start', auth, (req, res) => {
  const { partner_id } = req.body;
  if (!partner_id || typeof partner_id !== 'string')
    return res.status(400).json({ error: 'partner_id required' });

  // Can't start a hangout with yourself
  if (partner_id === req.user.id)
    return res.status(400).json({ error: 'Cannot start a hangout with yourself' });

  // Must be friends
  if (!areFriends(req.user.id, partner_id))
    return res.status(403).json({ error: 'You can only hang out with friends' });

  // Re-use any active hangout between these two
  const active = db.findOne('hangouts', h =>
    h.status === 'active' &&
    ((h.initiator_id === req.user.id && h.partner_id === partner_id) ||
     (h.initiator_id === partner_id  && h.partner_id === req.user.id))
  );
  if (active) return res.json({ id: active.id, existing: true });

  const id = uuid();
  db.insert('hangouts', {
    id,
    initiator_id: req.user.id,
    partner_id,
    status:       'active',
    started_at:   Date.now(),
    ended_at:     null,
  });
  res.status(201).json({ id, existing: false });
});

// ── GET /hangouts/:id ──────────────────────────────────────────
router.get('/:id', auth, (req, res) => {
  const hangout = db.findOne('hangouts', h =>
    h.id === req.params.id &&
    (h.initiator_id === req.user.id ||
     h.partner_id   === req.user.id ||
     (h.guest_ids || []).includes(req.user.id))
  );
  if (!hangout) return res.status(404).json({ error: 'Hangout not found' });

  const u1 = db.findOne('users', u => u.id === hangout.initiator_id);
  const u2 = db.findOne('users', u => u.id === hangout.partner_id);

  const messages = db.find('messages', m => m.hangout_id === req.params.id)
    .sort((a, b) => a.created_at - b.created_at)
    .map(m => {
      const sender = db.findOne('users', u => u.id === m.sender_id);
      return { ...m, sender_name: sender?.name, sender_color: sender?.avatar_color };
    });

  res.json({
    hangout: {
      ...hangout,
      initiator_name:  u1?.name,  initiator_color:  u1?.avatar_color,
      partner_name:    u2?.name,  partner_color:    u2?.avatar_color,
    },
    messages,
  });
});

// ── POST /hangouts/:id/end ─────────────────────────────────────
// Only the initiator or the partner can end the hangout.
// Guests (invited later) can leave, but cannot end it for everyone.
router.post('/:id/end', auth, (req, res) => {
  const hangout = db.findOne('hangouts', h =>
    h.id === req.params.id &&
    (h.initiator_id === req.user.id || h.partner_id === req.user.id)
  );
  if (!hangout) return res.status(404).json({ error: 'Hangout not found' });

  db.update('hangouts',
    h => h.id === req.params.id,
    { status: 'ended', ended_at: Date.now() }
  );
  res.json({ ok: true });
});

module.exports = router;
