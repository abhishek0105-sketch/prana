const jwt  = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db   = require('../db');
const { userSockets } = require('../socketState');
const { sendPush }    = require('../pushService');

// In-memory presence:  userId → status
const presence = {};

// In-memory room roster: hangoutId → { userId: { name, color, socketId } }
const hangoutRooms = {};

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
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    const uid = socket.user.id;
    console.log(`[socket] ${socket.user.name} connected`);

    userSockets[uid] = socket.id;

    presence[uid] = presence[uid] || 'free';

    const broadcastPresence = (status) => {
      presence[uid] = status;
      getFriendIds(uid).forEach(fid => {
        const sid = userSockets[fid];
        if (sid) io.to(sid).emit('presence-update', { userId: uid, status });
      });
    };

    broadcastPresence(presence[uid]);

    socket.on('get-friend-presence', () => {
      const map = {};
      getFriendIds(uid).forEach(fid => { map[fid] = presence[fid] || 'offline'; });
      socket.emit('friend-presence-map', map);
    });

    socket.on('set-presence', (status) => {
      broadcastPresence(status);
      if (status === 'free') {
        getFriendIds(uid).forEach(fid => {
          if (!userSockets[fid]) {
            sendPush(fid, {
              title: `${socket.user.name} is free! 🟢`,
              body:  'Tap to start a hangout',
              icon:  '/icon-192.png',
              tag:   `free-${uid}`,
              url:   '/home',
            });
          }
        });
      }
    });

    // ── Hangout room ───────────────────────────────────────────────
    socket.on('join-hangout', (hangoutId) => {
      socket.join(hangoutId);
      socket.hangoutId = hangoutId;
      broadcastPresence('in-hangout');

      // Register in room roster
      if (!hangoutRooms[hangoutId]) hangoutRooms[hangoutId] = {};
      hangoutRooms[hangoutId][uid] = {
        name:     socket.user.name,
        color:    socket.user.avatar_color,
        socketId: socket.id,
      };

      // Tell the new joiner who is already in the room
      const existing = Object.entries(hangoutRooms[hangoutId])
        .filter(([pid]) => pid !== uid)
        .map(([userId, info]) => ({ userId, ...info }));
      socket.emit('room-state', existing);

      // Tell everyone else a new peer joined
      socket.to(hangoutId).emit('peer-joined', {
        userId:   uid,
        name:     socket.user.name,
        color:    socket.user.avatar_color,
        socketId: socket.id,
      });
    });

    socket.on('hangout-ended', ({ hangoutId }) => {
      // Only initiator or partner may end the hangout for everyone
      const hangout = db.findOne('hangouts', h => h.id === hangoutId);
      if (!hangout) return;
      if (hangout.initiator_id !== uid && hangout.partner_id !== uid) return;

      socket.to(hangoutId).emit('hangout-ended', { by: socket.user.name });
      // Clean up room roster so memory doesn't accumulate
      delete hangoutRooms[hangoutId];
      broadcastPresence('free');
    });

    // ── Invite someone into a live hangout ─────────────────────────
    socket.on('invite-to-hangout', ({ hangoutId, targetUserId }) => {
      if (typeof targetUserId !== 'string') return;

      // Persist the invite in DB so the invitee passes the GET /hangouts/:id auth check
      const hangout = db.findOne('hangouts', h => h.id === hangoutId);
      if (!hangout) return;

      // Only someone currently in the room can invite others
      if (!hangoutRooms[hangoutId]?.[uid]) return;
      const guestIds = hangout.guest_ids || [];
      if (!guestIds.includes(targetUserId)) {
        db.update('hangouts', h => h.id === hangoutId, { guest_ids: [...guestIds, targetUserId] });
      }

      // Names of everyone currently in the room
      const roomNames = Object.values(hangoutRooms[hangoutId] || {}).map(p => p.name);

      const targetSid = userSockets[targetUserId];
      if (targetSid) {
        io.to(targetSid).emit('hangout-invite', {
          hangoutId,
          from:         { userId: uid, name: socket.user.name, color: socket.user.avatar_color },
          participants: roomNames,
        });
      } else {
        // Invitee is offline — push them
        sendPush(targetUserId, {
          title: `${socket.user.name} wants you in the hangout 🥂`,
          body:  roomNames.length > 1 ? `${roomNames.join(', ')} are waiting` : 'Come join!',
          icon:  '/icon-192.png',
          tag:   `invite-${hangoutId}`,
          url:   `/hangout/${hangoutId}`,
        });
      }
    });

    // ── WebRTC signaling — relay with fromUserId so peers can track each other ─
    socket.on('webrtc-offer',  ({ to, offer })     => io.to(to).emit('webrtc-offer',  { from: socket.id, fromUserId: uid, offer }));
    socket.on('webrtc-answer', ({ to, answer })    => io.to(to).emit('webrtc-answer', { from: socket.id, fromUserId: uid, answer }));
    socket.on('webrtc-ice',    ({ to, candidate }) => io.to(to).emit('webrtc-ice',    { from: socket.id, fromUserId: uid, candidate }));

    // ── Chat ───────────────────────────────────────────────────────
    socket.on('chat-message', ({ hangoutId, content }) => {
      // Reject missing, non-string, or oversized messages
      if (!content || typeof content !== 'string' || content.trim().length === 0) return;
      if (content.length > 4000) return;
      const msg = { id: uuid(), hangout_id: hangoutId, sender_id: uid, sender_name: socket.user.name, content: content.trim(), type: 'text', created_at: Date.now() };
      db.insert('messages', msg);
      io.to(hangoutId).emit('chat-message', msg);
    });

    // ── Toast ──────────────────────────────────────────────────────
    socket.on('toast-start', ({ hangoutId }) => {
      io.to(hangoutId).emit('toast-start', { by: socket.user.name });
    });

    // ── Activity broadcasts ────────────────────────────────────────
    socket.on('place-selected', ({ hangoutId, place, forUser }) => {
      socket.to(hangoutId).emit('place-selected', { place, forUser, by: socket.user.name });
    });

    socket.on('round-sent', ({ hangoutId, amount, message, receiver_name }) => {
      io.to(hangoutId).emit('round-sent', { amount, message, sender_name: socket.user.name, receiver_name });
    });

    // ── Watch Together ─────────────────────────────────────────────
    socket.on('watch-start', ({ hangoutId, videoId, source }) => {
      if (typeof videoId !== 'string' || videoId.length > 2000) return;
      const src = ['youtube', 'vimeo', 'direct', 'local', 'external', 'screen'].includes(source) ? source : 'direct';
      // Include sharer's userId so the receiver can look up their WebRTC stream
      socket.to(hangoutId).emit('watch-start', { videoId, source: src, by: socket.user.name, userId: uid });
    });

    socket.on('watch-stop', ({ hangoutId }) => {
      socket.to(hangoutId).emit('watch-stop', { by: socket.user.name });
    });

    socket.on('watch-control', ({ hangoutId, action, t }) => {
      if (!['play', 'pause', 'seek'].includes(action)) return;
      socket.to(hangoutId).emit('watch-control', { action, t: Number(t) || 0, by: socket.user.name });
    });

    // Streaming sync — relay ready state so both clients can start the countdown
    socket.on('watch-ready', ({ hangoutId, ready }) => {
      socket.to(hangoutId).emit('watch-ready', { ready: !!ready, userId: uid });
    });

    socket.on('video-toggle', ({ hangoutId, enabled }) =>
      socket.to(hangoutId).emit('video-toggle', { userId: uid, enabled }));
    socket.on('audio-toggle', ({ hangoutId, enabled }) =>
      socket.to(hangoutId).emit('audio-toggle', { userId: uid, enabled }));

    // ── Disconnect ─────────────────────────────────────────────────
    socket.on('disconnect', () => {
      delete userSockets[uid];
      presence[uid] = 'offline';

      if (socket.hangoutId) {
        // Remove from room roster
        if (hangoutRooms[socket.hangoutId]) {
          delete hangoutRooms[socket.hangoutId][uid];
          if (Object.keys(hangoutRooms[socket.hangoutId]).length === 0) {
            delete hangoutRooms[socket.hangoutId];
          }
        }
        socket.to(socket.hangoutId).emit('peer-left', { userId: uid, name: socket.user.name });
      }

      broadcastPresence('offline');
      console.log(`[socket] ${socket.user.name} disconnected`);
    });
  });
};
