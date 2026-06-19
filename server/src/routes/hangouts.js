const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db            = require('../db');
const auth          = require('../middleware/auth');
const { userSockets } = require('../socketState');
const { sendPush }    = require('../pushService');

const areFriends = async (id1, id2) =>
  !!(await db.findOne('friendships', f =>
    f.status === 'accepted' &&
    ((f.requester_id === id1 && f.addressee_id === id2) ||
     (f.requester_id === id2 && f.addressee_id === id1))
  ));

// ── POST /hangouts/start ───────────────────────────────────────
router.post('/start', auth, async (req, res) => {
  const { partner_id } = req.body;
  if (!partner_id || typeof partner_id !== 'string')
    return res.status(400).json({ error: 'partner_id required' });

  if (partner_id === req.user.id)
    return res.status(400).json({ error: 'Cannot start a hangout with yourself' });

  if (!(await areFriends(req.user.id, partner_id)))
    return res.status(403).json({ error: 'You can only hang out with friends' });

  const active = await db.findOne('hangouts', h =>
    h.status === 'active' &&
    ((h.initiator_id === req.user.id && h.partner_id === partner_id) ||
     (h.initiator_id === partner_id  && h.partner_id === req.user.id))
  );
  if (active) return res.json({ id: active.id, existing: true });

  const id = uuid();
  await db.insert('hangouts', {
    id, initiator_id: req.user.id, partner_id,
    status: 'active', started_at: Date.now(), ended_at: null,
  });

  // Notify partner immediately
  const partnerSocketId = userSockets[partner_id];
  const invitePayload = {
    hangoutId: id,
    from: { userId: req.user.id, name: req.user.name, color: req.user.avatar_color },
    participants: [req.user.name],
  };

  if (partnerSocketId && req.io) {
    req.io.to(partnerSocketId).emit('hangout-invite', invitePayload);
  } else {
    await sendPush(partner_id, {
      title: `${req.user.name} wants to hang out! 🥂`,
      body: 'Tap to join the hangout',
      icon: '/icon-192.png',
      tag: `hangout-${id}`,
      url: `/hangout/${id}`,
    });
  }

  res.status(201).json({ id, existing: false });
});

// ── GET /hangouts/:id ──────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  const hangout = await db.findOne('hangouts', h =>
    h.id === req.params.id &&
    (h.initiator_id === req.user.id ||
     h.partner_id   === req.user.id ||
     (h.guest_ids || []).includes(req.user.id))
  );
  if (!hangout) return res.status(404).json({ error: 'Hangout not found' });

  const [u1, u2, messages] = await Promise.all([
    db.findOne('users', u => u.id === hangout.initiator_id),
    db.findOne('users', u => u.id === hangout.partner_id),
    db.find('messages', m => m.hangout_id === req.params.id),
  ]);

  const enrichedMessages = await Promise.all(
    messages
      .sort((a, b) => a.created_at - b.created_at)
      .map(async m => {
        const sender = await db.findOne('users', u => u.id === m.sender_id);
        return { ...m, sender_name: sender?.name, sender_color: sender?.avatar_color };
      })
  );

  res.json({
    hangout: {
      ...hangout,
      initiator_name: u1?.name, initiator_color: u1?.avatar_color,
      partner_name:   u2?.name, partner_color:   u2?.avatar_color,
    },
    messages: enrichedMessages,
  });
});

// ── POST /hangouts/:id/end ─────────────────────────────────────
router.post('/:id/end', auth, async (req, res) => {
  const hangout = await db.findOne('hangouts', h =>
    h.id === req.params.id &&
    (h.initiator_id === req.user.id || h.partner_id === req.user.id)
  );
  if (!hangout) return res.status(404).json({ error: 'Hangout not found' });

  await db.update('hangouts',
    h => h.id === req.params.id,
    { status: 'ended', ended_at: Date.now() }
  );
  res.json({ ok: true });
});

module.exports = router;
