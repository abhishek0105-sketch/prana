const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { userSockets } = require('../socketState'); // shared with routes
const { sendPush } = require('../pushService');

// In-memory presence map: { userId: 'free' | 'busy' | 'in-hangout' | 'offline' }
const presence = {};

// Get all friend IDs for a user
const getFriendIds = (userId) => {
  const friendships = db.find('friendships', f =>
    f.status === 'accepted' && (f.requester_id === userId || f.addressee_id === userId)
  );
  return friendships.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id);
};

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.user.id;
    console.log(`[socket] ${socket.user.name} connected`);

    // Track socket per user
    userSockets[uid] = socket.id;

    // Set initial presence and notify friends
    presence[uid] = presence[uid] || 'free';
    const broadcastPresence = (status) => {
      presence[uid] = status;
      const friendIds = getFriendIds(uid);
      friendIds.forEach(fid => {
        const fSocketId = userSockets[fid];
        if (fSocketId) {
          io.to(fSocketId).emit('presence-update', { userId: uid, status });
        }
      });
    };

    broadcastPresence(presence[uid]);

    // Send current presence of all friends to this user
    socket.on('get-friend-presence', () => {
      const friendIds = getFriendIds(uid);
      const presenceMap = {};
      friendIds.forEach(fid => { presenceMap[fid] = presence[fid] || 'offline'; });
      socket.emit('friend-presence-map', presenceMap);
    });

    // User changes their status
    socket.on('set-presence', (status) => {
      broadcastPresence(status);

      // Push notification to offline friends when someone goes free
      if (status === 'free') {
        const friendIds = getFriendIds(uid);
        friendIds.forEach(fid => {
          if (!userSockets[fid]) { // friend is offline — push them
            sendPush(fid, {
              title: `${socket.user.name} is free! 🟢`,
              body: 'Tap to start a hangout',
              icon: '/icon-192.png',
              tag:  `free-${uid}`,  // replaces previous "free" ping from same person
              url:  '/home',
            });
          }
        });
      }
    });

    // ── Hangout room ───────────────────────────────────────────
    socket.on('join-hangout', (hangoutId) => {
      socket.join(hangoutId);
      socket.hangoutId = hangoutId;
      broadcastPresence('in-hangout');
      socket.to(hangoutId).emit('peer-joined', { userId: uid, name: socket.user.name, socketId: socket.id });
    });

    // Explicit hangout end
    socket.on('hangout-ended', ({ hangoutId }) => {
      socket.to(hangoutId).emit('hangout-ended', { by: socket.user.name });
      broadcastPresence('free');
    });

    // ── WebRTC signaling ───────────────────────────────────────
    socket.on('webrtc-offer',  ({ to, offer })      => io.to(to).emit('webrtc-offer',  { from: socket.id, offer }));
    socket.on('webrtc-answer', ({ to, answer })     => io.to(to).emit('webrtc-answer', { from: socket.id, answer }));
    socket.on('webrtc-ice',    ({ to, candidate })  => io.to(to).emit('webrtc-ice',    { from: socket.id, candidate }));

    // ── Chat ───────────────────────────────────────────────────
    socket.on('chat-message', ({ hangoutId, content }) => {
      const msg = { id: uuid(), hangout_id: hangoutId, sender_id: uid, sender_name: socket.user.name, content, type: 'text', created_at: Date.now() };
      db.insert('messages', msg);
      io.to(hangoutId).emit('chat-message', msg);
    });

    // ── Synchronized Toast 🥂 ──────────────────────────────────
    socket.on('toast-start', ({ hangoutId }) => {
      io.to(hangoutId).emit('toast-start', { by: socket.user.name });
    });

    // ── Activity broadcasts ────────────────────────────────────
    socket.on('place-selected', ({ hangoutId, place, forUser }) => {
      socket.to(hangoutId).emit('place-selected', { place, forUser, by: socket.user.name });
    });

    socket.on('round-sent', ({ hangoutId, amount, message, receiver_name }) => {
      io.to(hangoutId).emit('round-sent', { amount, message, sender_name: socket.user.name, receiver_name });
    });

    // ── Watch Together ─────────────────────────────────────────
    socket.on('watch-start', ({ hangoutId, videoId }) => {
      if (typeof videoId !== 'string' || videoId.length > 20) return;
      socket.to(hangoutId).emit('watch-start', { videoId, by: socket.user.name });
    });

    socket.on('watch-control', ({ hangoutId, action, t }) => {
      if (!['play', 'pause', 'seek'].includes(action)) return;
      socket.to(hangoutId).emit('watch-control', { action, t: Number(t) || 0, by: socket.user.name });
    });

    socket.on('video-toggle', ({ hangoutId, enabled }) => socket.to(hangoutId).emit('video-toggle', { userId: uid, enabled }));
    socket.on('audio-toggle', ({ hangoutId, enabled }) => socket.to(hangoutId).emit('audio-toggle', { userId: uid, enabled }));

    // ── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      delete userSockets[uid];
      presence[uid] = 'offline';
      if (socket.hangoutId) {
        socket.to(socket.hangoutId).emit('peer-left', { userId: uid, name: socket.user.name });
      }
      broadcastPresence('offline');
      console.log(`[socket] ${socket.user.name} disconnected`);
    });
  });
};
