const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db   = require('../db');
const auth = require('../middleware/auth');
const { userSockets } = require('../socketState');
const { sendPush } = require('../pushService');

const emitTo = (io, userId, event, data) => {
  const sid = userSockets[userId];
  if (sid) io.to(sid).emit(event, data);
};

const safeUser = (u) => u
  ? { id: u.id, name: u.name, email: u.email, avatar_color: u.avatar_color, city: u.city }
  : null;

const areFriends = async (myId, friendId) =>
  !!(await db.findOne('friendships', f =>
    f.status === 'accepted' &&
    ((f.requester_id === myId && f.addressee_id === friendId) ||
     (f.requester_id === friendId && f.addressee_id === myId))
  ));

// ── GET /friends ───────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const myId = req.user.id;
  const friendships = await db.find('friendships', f =>
    f.status === 'accepted' && (f.requester_id === myId || f.addressee_id === myId)
  );
  const friends = await Promise.all(friendships.map(async f => {
    const friendId = f.requester_id === myId ? f.addressee_id : f.requester_id;
    const user = await db.findOne('users', u => u.id === friendId);
    return user ? { ...safeUser(user), friendship_id: f.id } : null;
  }));
  res.json(friends.filter(Boolean));
});

// ── GET /friends/requests ──────────────────────────────────────
router.get('/requests', auth, async (req, res) => {
  const pending = await db.find('friendships', f =>
    f.addressee_id === req.user.id && f.status === 'pending'
  );
  const requests = await Promise.all(pending.map(async f => {
    const user = await db.findOne('users', u => u.id === f.requester_id);
    return user ? { ...safeUser(user), id: f.id, user_id: user.id, created_at: f.created_at } : null;
  }));
  res.json(requests.filter(Boolean));
});

// ── POST /friends/search ───────────────────────────────────────
router.post('/search', auth, async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string')
    return res.status(400).json({ error: 'Email required' });

  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail === req.user.email)
    return res.status(400).json({ error: "That's your own email! Enter your friend's email." });

  const user = await db.findOne('users', u => u.email === cleanEmail && u.id !== req.user.id);
  if (!user)
    return res.status(404).json({ error: 'No CLINK account found. Ask your friend to sign up first.' });

  const existing = await db.findOne('friendships', f =>
    (f.requester_id === req.user.id && f.addressee_id === user.id) ||
    (f.requester_id === user.id     && f.addressee_id === req.user.id)
  );
  res.json({ user: safeUser(user), friendship_status: existing ? existing.status : null });
});

// ── POST /friends/request ──────────────────────────────────────
router.post('/request', auth, async (req, res) => {
  const { addressee_id } = req.body;
  if (!addressee_id || typeof addressee_id !== 'string')
    return res.status(400).json({ error: 'addressee_id required' });

  if (addressee_id === req.user.id)
    return res.status(400).json({ error: 'You cannot add yourself' });

  if (!(await db.findOne('users', u => u.id === addressee_id)))
    return res.status(404).json({ error: 'User not found' });

  const existing = await db.findOne('friendships', f =>
    (f.requester_id === req.user.id && f.addressee_id === addressee_id) ||
    (f.requester_id === addressee_id && f.addressee_id === req.user.id)
  );
  if (existing) return res.status(409).json({ error: 'Request already exists' });

  const id = uuid();
  await db.insert('friendships', {
    id, requester_id: req.user.id, addressee_id,
    status: 'pending', created_at: Date.now(),
  });

  emitTo(req.io, addressee_id, 'friend-request', {
    id, user_id: req.user.id, name: req.user.name, email: req.user.email,
  });
  if (!userSockets[addressee_id]) {
    sendPush(addressee_id, {
      title: `${req.user.name} wants to be buddies 👋`,
      body: 'Open CLINK to accept',
      icon: '/icon-192.png', tag: `req-${id}`, url: '/home',
    });
  }

  res.json({ ok: true, id });
});

// ── POST /friends/accept ───────────────────────────────────────
router.post('/accept', auth, async (req, res) => {
  const { friendship_id } = req.body;
  if (!friendship_id) return res.status(400).json({ error: 'friendship_id required' });

  const f = await db.findOne('friendships',
    f => f.id === friendship_id && f.addressee_id === req.user.id && f.status === 'pending'
  );
  if (!f) return res.status(404).json({ error: 'Request not found' });

  await db.update('friendships', f => f.id === friendship_id, { status: 'accepted' });

  emitTo(req.io, f.requester_id, 'friend-accepted', {
    name: req.user.name, email: req.user.email,
  });

  res.json({ ok: true });
});

// ── POST /friends/decline ──────────────────────────────────────
router.post('/decline', auth, async (req, res) => {
  const { friendship_id } = req.body;
  if (!friendship_id) return res.status(400).json({ error: 'friendship_id required' });

  const f = await db.findOne('friendships',
    f => f.id === friendship_id && f.addressee_id === req.user.id && f.status === 'pending'
  );
  if (!f) return res.status(404).json({ error: 'Pending request not found' });

  await db.remove('friendships', f => f.id === friendship_id);
  res.json({ ok: true });
});

// ── GET /friends/stats/:friendId ───────────────────────────────
router.get('/stats/:friendId', auth, async (req, res) => {
  const myId     = req.user.id;
  const friendId = req.params.friendId;

  if (!(await areFriends(myId, friendId)))
    return res.status(403).json({ error: 'Not friends' });

  const hangouts = (await db.find('hangouts', h =>
    h.status === 'ended' &&
    ((h.initiator_id === myId && h.partner_id === friendId) ||
     (h.initiator_id === friendId && h.partner_id === myId))
  )).sort((a, b) => a.started_at - b.started_at);

  const totalHangouts = hangouts.length;
  const firstHangout  = hangouts[0] || null;
  const lastHangout   = hangouts[hangouts.length - 1] || null;

  const days = [...new Set(hangouts.map(h => new Date(h.started_at).toDateString()))];
  let streak = 0;
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (days.includes(today) || days.includes(yesterday)) {
    let checkDate = days.includes(today) ? new Date() : new Date(Date.now() - 86400000);
    while (days.includes(checkDate.toDateString())) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    }
  }

  const todayMonthDay = new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' });
  const onThisDay = hangouts.filter(h => {
    const d = new Date(h.started_at);
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) === todayMonthDay &&
      new Date().getFullYear() - d.getFullYear() > 0;
  });

  res.json({ totalHangouts, streak, firstHangout, lastHangout, onThisDay });
});

module.exports = router;
