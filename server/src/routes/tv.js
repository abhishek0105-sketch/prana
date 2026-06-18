/**
 * TV Session API — TV polls unauthenticated (no user session on the TV).
 * Phone-side writes (video, control, delete) require a valid JWT so only
 * the logged-in user who owns the session can push commands.
 */
const router = require('express').Router();
const auth   = require('../middleware/auth');

// In-memory session store: code → { videoId, source, control, seq, ts }
const sessions = {};
const TTL_MS   = 2 * 60 * 60 * 1000; // 2 hours

// Periodic cleanup of expired sessions
setInterval(() => {
  const cutoff = Date.now() - TTL_MS;
  for (const code of Object.keys(sessions)) {
    if (sessions[code].ts < cutoff) delete sessions[code];
  }
}, 5 * 60 * 1000);

// ── TV polls this endpoint every 3 seconds ─────────────────────
router.get('/:code', (req, res) => {
  const s = sessions[req.params.code];
  if (!s) return res.json({ videoId: null, source: null, control: null, seq: 0, videoSeq: 0 });
  res.json({ videoId: s.videoId, source: s.source, control: s.control, seq: s.seq, videoSeq: s.videoSeq || 0 });
});

// ── Phone sends the video to play on the TV ────────────────────
router.post('/:code/video', auth, (req, res) => {
  const { videoId, source } = req.body || {};
  if (!videoId || !source) return res.status(400).json({ error: 'videoId and source required' });
  if (typeof videoId !== 'string' || videoId.length > 2000) return res.status(400).json({ error: 'Invalid videoId' });

  const allowed = ['youtube', 'vimeo', 'direct', 'external'];
  const src = allowed.includes(source) ? source : 'direct';

  const prev = sessions[req.params.code];
  sessions[req.params.code] = {
    videoId:   videoId,
    source:    src,
    control:   null,
    seq:       0,
    videoSeq:  (prev?.videoSeq || 0) + 1, // increments even on re-send of same URL
    ts:        Date.now(),
  };
  res.json({ ok: true });
});

// ── Phone sends play / pause / seek commands ───────────────────
router.post('/:code/control', auth, (req, res) => {
  const { action, t } = req.body || {};
  if (!['play', 'pause', 'seek'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

  const s = sessions[req.params.code];
  if (!s) return res.status(404).json({ error: 'Session not found. Start a video first.' });

  // Clamp t to a sane range (0 – 24 hours) to prevent malformed seek values
  const clampedT = Math.min(Math.max(Number(t) || 0, 0), 86400);
  s.control = { action, t: clampedT };
  s.seq     = (s.seq || 0) + 1;
  s.ts      = Date.now();
  res.json({ ok: true });
});

// ── Phone clears the TV session (stop sharing) ─────────────────
router.delete('/:code', auth, (req, res) => {
  delete sessions[req.params.code];
  res.json({ ok: true });
});

module.exports = router;
