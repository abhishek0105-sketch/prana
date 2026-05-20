import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhoneOff, MessageCircle, MapPin, Wine, Mic, MicOff, Video, VideoOff, X, GlassWater } from 'lucide-react';
import ToastCountdown from '../components/ToastCountdown';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../lib/api';
import VideoRoom from '../components/VideoRoom';
import ChatPanel from '../components/ChatPanel';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export default function Hangout() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [hangout, setHangout]               = useState(null);
  const [messages, setMessages]             = useState([]);
  const [activeTab, setActiveTab]           = useState(null);
  const [muted, setMuted]                   = useState(false);
  const [camOff, setCamOff]                 = useState(false);
  const [camError, setCamError]             = useState(false);
  const [camErrorReason, setCamErrorReason] = useState('');
  const [toastActive, setToastActive]       = useState(false);
  const [toastBy, setToastBy]               = useState('');
  const [peerConnected, setPeerConnected]   = useState(false);
  const [notification, setNotification]     = useState('');

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);
  const pendingRemote  = useRef(null);

  // ── Fetch hangout info ──────────────────────────────────────────
  useEffect(() => {
    api.get(`/hangouts/${id}`)
      .then(d => { setHangout(d.hangout); setMessages(d.messages); })
      .catch(() => nav('/home'));
  }, [id]);

  // ── Main: camera FIRST, then socket ────────────────────────────
  useEffect(() => {
    if (!socket || !hangout) return;
    let cancelled = false;

    const buildPC = (peerId) => {
      pcRef.current?.close();
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
          console.log('[webrtc] added track:', track.kind);
        });
      }

      pc.ontrack = (e) => {
        console.log('[webrtc] got remote track:', e.track.kind);
        const remoteStream = e.streams[0];
        pendingRemote.current = remoteStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('webrtc-ice', { to: peerId, candidate: e.candidate });
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        console.log('[webrtc] state:', s);
        if (s === 'connected')                       setPeerConnected(true);
        if (s === 'disconnected' || s === 'failed')  setPeerConnected(false);
      };

      return pc;
    };

    const sendOffer = async (peerId) => {
      const pc = buildPC(peerId);
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { to: peerId, offer });
    };

    const init = async () => {
      // 1️⃣ Camera / mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.warn('[camera] failed:', err.name, err.message);
        if (!cancelled) {
          setCamError(true);
          setCamErrorReason(err.name === 'NotReadableError' ? 'busy' : 'denied');
        }
      }

      if (cancelled) return;

      // 2️⃣ Socket listeners
      socket.on('peer-joined', ({ socketId }) => {
        setPeerConnected(true);
        sendOffer(socketId);
      });

      socket.on('webrtc-offer', async ({ from, offer }) => {
        setPeerConnected(true);
        const pc = buildPC(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { to: from, answer });
      });

      socket.on('webrtc-answer', async ({ answer }) => {
        if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('webrtc-ice', ({ candidate }) => {
        if (pcRef.current && candidate)
          pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      });

      socket.on('chat-message', (msg) => setMessages(m => [...m, msg]));

      socket.on('peer-left', ({ name }) => {
        setPeerConnected(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        pendingRemote.current = null;
        showNotif(`${name} left the hangout`);
      });

      socket.on('hangout-ended', () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        pcRef.current?.close();
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

      // 3️⃣ Join room
      socket.emit('join-hangout', id);
    };

    init();

    return () => {
      cancelled = true;
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
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, [socket, hangout]);

  useEffect(() => {
    if (remoteVideoRef.current && pendingRemote.current) {
      remoteVideoRef.current.srcObject = pendingRemote.current;
    }
  });

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
    pcRef.current?.close();
    nav('/home');
    api.post(`/hangouts/${id}/end`).catch(() => {});
  };

  const sendMessage = (content) => socket?.emit('chat-message', { hangoutId: id, content });

  const startToast = () => {
    socket?.emit('toast-start', { hangoutId: id });
    setToastBy('');
    setToastActive(true);
  };

  const showNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 4000); };

  const friend = hangout
    ? (hangout.initiator_id === user?.id
        ? { name: hangout.partner_name,   color: hangout.partner_color }
        : { name: hangout.initiator_name, color: hangout.initiator_color })
    : null;

  return (
    <div className="h-screen bg-bg flex flex-col max-w-lg mx-auto overflow-hidden">

      {/* ── Video area ───────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <VideoRoom
          localRef={localVideoRef}
          remoteRef={remoteVideoRef}
          peerConnected={peerConnected}
          friend={friend}
          camOff={camOff}
          camError={camError}
          camErrorReason={camErrorReason}
          user={user}
        />

        {/* Notification pill */}
        {notification && (
          <div className="absolute top-20 left-4 right-4 px-4 py-3 rounded-2xl text-sm font-semibold fade-in z-20"
            style={{
              background: 'rgba(15,15,30,0.9)',
              border: '1px solid rgba(139,92,246,0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 20px rgba(139,92,246,0.15)',
            }}>
            {notification}
          </div>
        )}

        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between z-10"
          style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.9) 0%, transparent 100%)' }}>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-0.5">Hanging out with</p>
            <p className="text-white font-display font-bold text-xl">{friend?.name || '...'}</p>
          </div>
          {/* Live / waiting indicator */}
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold"
            style={peerConnected ? {
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#10B981',
            } : {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#6B7280',
            }}>
            <div className={`w-2 h-2 rounded-full ${peerConnected ? 'animate-pulse' : 'opacity-50'}`}
              style={{ background: peerConnected ? '#10B981' : '#6B7280' }} />
            {peerConnected ? '● Live' : 'Waiting...'}
          </div>
        </div>
      </div>

      {/* ── Controls bar ────────────────────────────────────────── */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(8,8,15,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}>

        {/* Left: mic + cam */}
        <div className="flex gap-2.5">
          <button onClick={toggleMute}
            className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={muted ? {
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#EF4444',
            } : {
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}>
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button onClick={toggleCam}
            className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={camOff ? {
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#EF4444',
            } : {
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}>
            {camOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        </div>

        {/* Center: end call */}
        <button onClick={endHangout}
          className="w-14 h-14 flex items-center justify-center rounded-2xl transition-all active:scale-90"
          style={{
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            boxShadow: '0 0 25px rgba(239,68,68,0.4)',
          }}>
          <PhoneOff size={22} color="white" />
        </button>

        {/* Right: features */}
        <div className="flex gap-2.5">
          <button onClick={() => setActiveTab(t => t === 'places' ? null : 'places')}
            className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={activeTab === 'places' ? {
              background: 'linear-gradient(135deg, #8B5CF6, #F472B6)',
              border: '1px solid transparent',
              color: '#fff',
              boxShadow: '0 0 15px rgba(139,92,246,0.4)',
            } : {
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}>
            <MapPin size={20} />
          </button>
          <button onClick={() => setActiveTab(t => t === 'chat' ? null : 'chat')}
            className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={activeTab === 'chat' ? {
              background: 'linear-gradient(135deg, #8B5CF6, #F472B6)',
              border: '1px solid transparent',
              color: '#fff',
              boxShadow: '0 0 15px rgba(139,92,246,0.4)',
            } : {
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}>
            <MessageCircle size={20} />
          </button>
          <button onClick={startToast}
            className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            title="Synchronized Toast 🥂"
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: '#F59E0B',
            }}>
            <GlassWater size={20} />
          </button>
          <button onClick={() => nav(`/hangout/${id}/send-round`)}
            className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={{
              background: 'rgba(236,72,153,0.1)',
              border: '1px solid rgba(236,72,153,0.2)',
              color: '#EC4899',
            }}>
            <Wine size={20} />
          </button>
        </div>
      </div>

      {/* ── Slide-up panels ─────────────────────────────────────── */}
      {activeTab && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveTab(null)} />
          <div className="relative rounded-t-[2rem] slide-up max-w-lg mx-auto w-full overflow-hidden"
            style={{
              maxHeight: '70vh',
              background: '#0F0F1E',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-xl font-display font-black text-white">
                {activeTab === 'chat' ? '💬 Chat' : '📍 Find a Place'}
              </h3>
              <button onClick={() => setActiveTab(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

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
          </div>
        </div>
      )}

      {/* Toast countdown overlay */}
      {toastActive && (
        <ToastCountdown by={toastBy} onDone={() => setToastActive(false)} />
      )}
    </div>
  );
}
