import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PhoneOff, MessageCircle, MapPin, Wine, Mic, MicOff,
  Video, VideoOff, X, GlassWater, Film, UserPlus, Check,
} from 'lucide-react';
import ToastCountdown from '../components/ToastCountdown';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../lib/api';
import VideoGrid from '../components/VideoGrid';
import ChatPanel from '../components/ChatPanel';
import WatchTogether from '../components/WatchTogether';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302'  },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function Hangout() {
  const { id } = useParams();
  const nav    = useNavigate();
  const { user }  = useAuth();
  const socket    = useSocket();

  const [hangout,      setHangout]      = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [activeTab,    setActiveTab]    = useState(null);
  const [muted,        setMuted]        = useState(false);
  const [camOff,       setCamOff]       = useState(false);
  const [camError,     setCamError]     = useState(false);
  const [camErrorReason, setCamErrorReason] = useState('');
  const [toastActive,  setToastActive]  = useState(false);
  const [toastBy,      setToastBy]      = useState('');
  const [notification, setNotification] = useState('');
  const [watchVideoId, setWatchVideoId] = useState(null);
  const [watchControl, setWatchControl] = useState(null);

  // ── Group / peers state ───────────────────────────────────────
  // peers: { [userId]: { userId, name, color, socketId, stream, muted, camOff, connected } }
  const [peers, setPeers]           = useState({});
  const [invitePanel, setInvitePanel] = useState(false);
  const [allFriends,   setAllFriends] = useState([]);
  const [inviting,     setInviting]   = useState({});   // userId → true while invite sending

  // ── Refs ──────────────────────────────────────────────────────
  const localStreamRef = useRef(null);
  const pcsRef         = useRef({});   // userId → RTCPeerConnection
  const socketToPeer   = useRef({});   // socketId → userId  (for answer/ICE lookup)

  // ── Helpers ───────────────────────────────────────────────────
  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const updatePeer = useCallback((userId, patch) => {
    setPeers(prev => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), ...patch, userId },
    }));
  }, []);

  const removePeer = useCallback((userId) => {
    setPeers(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    if (pcsRef.current[userId]) {
      pcsRef.current[userId].close();
      delete pcsRef.current[userId];
    }
  }, []);

  // ── Build a PeerConnection for a remote peer ──────────────────
  const buildPC = useCallback((userId, peerSocketId) => {
    if (pcsRef.current[userId]) {
      pcsRef.current[userId].close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcsRef.current[userId] = pc;
    socketToPeer.current[peerSocketId] = userId;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(t =>
      pc.addTrack(t, localStreamRef.current)
    );

    // Remote stream arrived
    pc.ontrack = (e) => {
      updatePeer(userId, { stream: e.streams[0], connected: true });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket?.emit('webrtc-ice', { to: peerSocketId, candidate: e.candidate });
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected')    updatePeer(userId, { connected: true });
      if (s === 'disconnected' || s === 'failed') updatePeer(userId, { connected: false });
    };

    return pc;
  }, [socket, updatePeer]);

  // ── Fetch hangout + friends ───────────────────────────────────
  useEffect(() => {
    api.get(`/hangouts/${id}`)
      .then(d => { setHangout(d.hangout); setMessages(d.messages); })
      .catch(() => nav('/home'));
    api.get('/friends').then(setAllFriends).catch(() => {});
  }, [id]);

  // ── Main: camera first, then socket ──────────────────────────
  useEffect(() => {
    if (!socket || !hangout) return;
    let cancelled = false;

    const init = async () => {
      // 1️⃣ Camera / mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
      } catch (err) {
        if (!cancelled) {
          setCamError(true);
          setCamErrorReason(err.name === 'NotReadableError' ? 'busy' : 'denied');
        }
      }
      if (cancelled) return;

      // 2️⃣ Socket listeners
      // ── Room state: sent to us when we first join, listing all current peers ──
      socket.on('room-state', (existingPeers) => {
        existingPeers.forEach(({ userId: pid, name, color, socketId }) => {
          updatePeer(pid, { name, color, socketId, connected: false });
          socketToPeer.current[socketId] = pid;
          // We send an offer to each existing peer
          buildPC(pid, socketId);
          pcsRef.current[pid].createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true })
            .then(offer => pcsRef.current[pid].setLocalDescription(offer).then(() =>
              socket.emit('webrtc-offer', { to: socketId, offer })
            ));
        });
      });

      // ── New peer joined after us ──
      socket.on('peer-joined', ({ userId: pid, name, color, socketId }) => {
        updatePeer(pid, { name, color, socketId, connected: false });
        socketToPeer.current[socketId] = pid;
        showNotif(`${name} joined 🥂`);
        // They will send us an offer; we don't send here (avoid race)
        buildPC(pid, socketId);
      });

      // ── WebRTC signaling ──
      socket.on('webrtc-offer', async ({ from: fromSid, fromUserId, offer }) => {
        const pid = fromUserId || socketToPeer.current[fromSid] || fromSid;
        if (!pcsRef.current[pid]) buildPC(pid, fromSid);
        const pc = pcsRef.current[pid];
        socketToPeer.current[fromSid] = pid;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { to: fromSid, answer });
      });

      socket.on('webrtc-answer', async ({ from: fromSid, fromUserId, answer }) => {
        const pid = fromUserId || socketToPeer.current[fromSid];
        if (pid && pcsRef.current[pid]) {
          await pcsRef.current[pid].setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on('webrtc-ice', ({ from: fromSid, fromUserId, candidate }) => {
        const pid = fromUserId || socketToPeer.current[fromSid];
        if (pid && pcsRef.current[pid] && candidate) {
          pcsRef.current[pid].addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
      });

      socket.on('chat-message', (msg) => setMessages(m => [...m, msg]));

      socket.on('peer-left', ({ userId: pid, name }) => {
        removePeer(pid);
        showNotif(`${name} left`);
      });

      socket.on('hangout-ended', () => {
        cleanup();
        nav('/home');
      });

      socket.on('round-sent', ({ amount, sender_name, receiver_name, message }) => {
        showNotif(`🥂 ${sender_name} sent $${amount} to ${receiver_name}${message ? ` — "${message}"` : ''}`);
      });

      socket.on('place-selected', ({ place, by }) => {
        showNotif(`📍 ${by} found a spot: ${place.name}`);
      });

      socket.on('toast-start', ({ by }) => {
        setToastBy(by || '');
        setToastActive(true);
      });

      socket.on('watch-start', ({ videoId, source, by }) => {
        setWatchVideoId({ videoId, source: source || 'youtube' });
        showNotif(`🎬 ${by} started a video — tap 🎬 to join`);
      });

      socket.on('watch-control', ({ action, t }) => {
        setWatchControl({ action, t, ts: Date.now() });
      });

      socket.on('video-toggle', ({ userId: pid, enabled }) => {
        updatePeer(pid, { camOff: !enabled });
      });

      socket.on('audio-toggle', ({ userId: pid, enabled }) => {
        updatePeer(pid, { muted: !enabled });
      });

      // 3️⃣ Join room
      socket.emit('join-hangout', id);
    };

    const cleanup = () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(pcsRef.current).forEach(pc => pc.close());
      pcsRef.current = {};
    };

    init();

    return () => {
      cancelled = true;
      socket.off('room-state');
      socket.off('peer-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice');
      socket.off('chat-message');
      socket.off('peer-left');
      socket.off('hangout-ended');
      socket.off('toast-start');
      socket.off('round-sent');
      socket.off('place-selected');
      socket.off('watch-start');
      socket.off('watch-control');
      socket.off('video-toggle');
      socket.off('audio-toggle');
      cleanup();
    };
  }, [socket, hangout]);

  // ── Controls ──────────────────────────────────────────────────
  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = muted;
    setMuted(m => { socket?.emit('audio-toggle', { hangoutId: id, enabled: m }); return !m; });
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = camOff;
    setCamOff(c => { socket?.emit('video-toggle', { hangoutId: id, enabled: c }); return !c; });
  };

  const endHangout = async () => {
    socket?.emit('hangout-ended', { hangoutId: id });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(pcsRef.current).forEach(pc => pc.close());
    nav('/home');
    api.post(`/hangouts/${id}/end`).catch(() => {});
  };

  const sendMessage = (content) => socket?.emit('chat-message', { hangoutId: id, content });

  const startToast = () => {
    socket?.emit('toast-start', { hangoutId: id });
    setToastBy('');
    setToastActive(true);
  };

  const sendInvite = (friendId) => {
    setInviting(prev => ({ ...prev, [friendId]: true }));
    socket?.emit('invite-to-hangout', { hangoutId: id, targetUserId: friendId });
    setTimeout(() => setInviting(prev => ({ ...prev, [friendId]: false })), 3000);
  };

  // Friends not already in the hangout
  const peerIds = new Set(Object.keys(peers));
  const invitableFriends = allFriends.filter(f =>
    f.id !== user?.id && !peerIds.has(f.id)
  );

  const peersArray = Object.values(peers);

  const tabTitle = activeTab === 'chat'   ? '💬 Chat'
                 : activeTab === 'watch'  ? '🎬 Watch Together'
                 : activeTab === 'invite' ? '👤 Invite Buddies'
                 :                          '📍 Find a Place';

  return (
    <div className="h-screen bg-bg flex flex-col max-w-lg mx-auto overflow-hidden">

      {/* ── Video area ────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <VideoGrid
          localStream={localStreamRef.current}
          localCamOff={camOff}
          localCamError={camError}
          localMuted={muted}
          peers={peersArray}
          user={user}
        />

        {/* Notification pill */}
        {notification && (
          <div className="absolute top-20 left-4 right-4 px-4 py-3 rounded-2xl text-sm font-semibold fade-in z-20 text-white"
            style={{
              background: 'rgba(15,15,30,0.92)',
              border: '1px solid rgba(139,92,246,0.3)',
              backdropFilter: 'blur(20px)',
            }}>
            {notification}
          </div>
        )}

        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between z-10"
          style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.85) 0%, transparent 100%)' }}>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-0.5">
              {peersArray.length === 0 ? 'Waiting...' : `${peersArray.length + 1} in here`}
            </p>
            <p className="text-white font-display font-bold text-xl leading-tight">
              {peersArray.length === 0
                ? 'Your hangout'
                : peersArray.map(p => p.name?.split(' ')[0]).join(', ')}
            </p>
          </div>
          {/* Live badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold"
            style={peersArray.length > 0 ? {
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#10B981',
            } : {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#6B7280',
            }}>
            <div className={`w-2 h-2 rounded-full ${peersArray.length > 0 ? 'animate-pulse' : 'opacity-50'}`}
              style={{ background: peersArray.length > 0 ? '#10B981' : '#6B7280' }} />
            {peersArray.length > 0 ? 'Live' : 'Waiting'}
          </div>
        </div>
      </div>

      {/* ── Controls bar ──────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(8,8,15,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}>

        {/* Left: mic + cam */}
        <div className="flex gap-2">
          <button onClick={toggleMute}
            className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={muted ? {
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444',
            } : {
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
            }}>
            {muted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button onClick={toggleCam}
            className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={camOff ? {
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444',
            } : {
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
            }}>
            {camOff ? <VideoOff size={18} /> : <Video size={18} />}
          </button>
        </div>

        {/* Center: end call */}
        <button onClick={endHangout}
          className="w-14 h-14 flex items-center justify-center rounded-2xl transition-all active:scale-90"
          style={{
            background: 'linear-gradient(135deg,#EF4444,#DC2626)',
            boxShadow: '0 0 25px rgba(239,68,68,0.4)',
          }}>
          <PhoneOff size={22} color="white" />
        </button>

        {/* Right: features */}
        <div className="flex gap-2">
          {/* Invite */}
          <button onClick={() => setActiveTab(t => t === 'invite' ? null : 'invite')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={activeTab === 'invite' ? {
              background: 'linear-gradient(135deg,#8B5CF6,#F472B6)',
              color: '#fff', boxShadow: '0 0 15px rgba(139,92,246,0.4)',
            } : {
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
            }}>
            <UserPlus size={18} />
          </button>
          {/* Chat */}
          <button onClick={() => setActiveTab(t => t === 'chat' ? null : 'chat')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={activeTab === 'chat' ? {
              background: 'linear-gradient(135deg,#8B5CF6,#F472B6)',
              color: '#fff', boxShadow: '0 0 15px rgba(139,92,246,0.4)',
            } : {
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
            }}>
            <MessageCircle size={18} />
          </button>
          {/* Watch */}
          <button onClick={() => setActiveTab(t => t === 'watch' ? null : 'watch')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            title="Watch Together"
            style={activeTab === 'watch' ? {
              background: 'linear-gradient(135deg,#8B5CF6,#F472B6)',
              color: '#fff', boxShadow: '0 0 15px rgba(139,92,246,0.4)',
            } : watchVideoId ? {
              background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', color: '#A78BFA',
            } : {
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
            }}>
            <Film size={18} />
          </button>
          {/* Toast */}
          <button onClick={startToast}
            className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B' }}>
            <GlassWater size={18} />
          </button>
        </div>
      </div>

      {/* ── Slide-up panels ────────────────────────────────────────── */}
      {activeTab && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveTab(null)} />
          <div className="relative rounded-t-[2rem] slide-up max-w-lg mx-auto w-full overflow-hidden overflow-y-auto"
            style={{
              maxHeight: activeTab === 'watch' ? '85vh' : '70vh',
              background: '#0F0F1E',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}>

            <div className="flex items-center justify-between px-6 pt-5 pb-3 sticky top-0"
              style={{ background: '#0F0F1E', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 className="text-xl font-display font-black text-white">{tabTitle}</h3>
              <button onClick={() => setActiveTab(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* ── Invite panel ── */}
            {activeTab === 'invite' && (
              <div className="px-5 py-4 flex flex-col gap-3">
                {invitableFriends.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="text-gray-400 font-semibold">All your buddies are here!</p>
                    <p className="text-gray-600 text-sm mt-1">Or add more buddies from Home</p>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-500 text-sm">Tap to send an invite — they'll see an incoming call screen</p>
                    {invitableFriends.map(f => {
                      const sent = inviting[f.id];
                      return (
                        <div key={f.id} className="flex items-center gap-3 rounded-2xl p-3"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white flex-shrink-0 text-base"
                            style={{ background: f.avatar_color || 'linear-gradient(135deg,#8B5CF6,#F472B6)' }}>
                            {f.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{f.name}</p>
                            <p className="text-gray-600 text-xs">{f.city || 'Buddy'}</p>
                          </div>
                          <button
                            onClick={() => !sent && sendInvite(f.id)}
                            disabled={sent}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                            style={sent ? {
                              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981',
                            } : {
                              background: 'linear-gradient(135deg,#8B5CF6,#F472B6)', color: '#fff',
                            }}>
                            {sent ? <><Check size={13} /> Invited</> : 'Invite'}
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <ChatPanel messages={messages} onSend={sendMessage} userId={user?.id} />
            )}

            {activeTab === 'places' && (
              <div className="px-6 pb-8 flex flex-col gap-4">
                <p className="text-gray-500">Find the same spot in both your cities simultaneously</p>
                <button className="btn-primary w-full"
                  onClick={() => { setActiveTab(null); nav(`/hangout/${id}/places`); }}>
                  🗺️ Open Place Finder
                </button>
              </div>
            )}

            {activeTab === 'watch' && (
              <WatchTogether
                hangoutId={id}
                socket={socket}
                remoteVideo={watchVideoId}
                remoteControl={watchControl}
              />
            )}
          </div>
        </div>
      )}

      {toastActive && <ToastCountdown by={toastBy} onDone={() => setToastActive(false)} />}
    </div>
  );
}
