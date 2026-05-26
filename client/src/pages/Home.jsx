import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Bell, LogOut, MapPin, Users, Search, Check, X, Clock, Sparkles, Zap, Plane, Heart, Wine, Smile, Globe, Link } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../lib/api';
import FriendCard from '../components/FriendCard';
import IncomingHangout from '../components/IncomingHangout';
import usePushNotifications from '../hooks/usePushNotifications';

const PRESENCE_OPTIONS = [
  { key: 'free',       emoji: '🟢', label: "I'm Free",      hint: 'Your buddies can see you\'re available',  color: '#10B981', grad: 'linear-gradient(135deg,#10B981,#059669)' },
  { key: 'busy',       emoji: '🔴', label: "I'm Busy",       hint: 'Your buddies know you\'re unavailable',   color: '#EF4444', grad: 'linear-gradient(135deg,#EF4444,#DC2626)' },
  { key: 'in-hangout', emoji: '🟡', label: 'In a Hangout',  hint: 'You\'re currently hanging out',      color: '#F59E0B', grad: 'linear-gradient(135deg,#F59E0B,#D97706)' },
];

export default function Home() {
  const { user, logout, updateCity } = useAuth();
  const socket = useSocket();
  const nav = useNavigate();
  usePushNotifications(); // request permission + register subscription

  const [friends, setFriends]               = useState([]);
  const [requests, setRequests]             = useState([]);
  const [friendPresence, setFriendPresence] = useState({});
  const [myPresence, setMyPresence]         = useState('free');
  const [panel, setPanel]                   = useState(null);
  const [searchEmail, setSearchEmail]       = useState('');
  const [searchResult, setSearchResult]     = useState(null);
  const [searchError, setSearchError]       = useState('');
  const [cityInput, setCityInput]           = useState(user?.city || '');
  const [loading, setLoading]               = useState(false);
  const [toast, setToast]                   = useState('');
  const [inviteCopied,     setInviteCopied]     = useState(false);
  const [incomingHangout,  setIncomingHangout]  = useState(null);

  useEffect(() => { loadFriends(); loadRequests(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit('get-friend-presence');
    socket.emit('set-presence', myPresence);
    socket.on('friend-presence-map', (map) => setFriendPresence(map));
    socket.on('presence-update', ({ userId, status }) => setFriendPresence(p => ({ ...p, [userId]: status })));

    // Real-time friend updates — no refresh needed
    socket.on('friend-request', () => {
      loadRequests();
      showToast('📩 New buddy request!');
    });
    socket.on('friend-accepted', ({ name }) => {
      loadFriends();
      showToast(`🥂 ${name} accepted your request!`);
    });

    socket.on('hangout-invite', (invite) => {
      setIncomingHangout(invite);
    });

    return () => {
      socket.off('friend-presence-map');
      socket.off('presence-update');
      socket.off('friend-request');
      socket.off('friend-accepted');
      socket.off('hangout-invite');
    };
  }, [socket]);

  const setPresence = (status) => { setMyPresence(status); socket?.emit('set-presence', status); setPanel(null); };
  const showToast   = (msg)     => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const loadFriends  = () => api.get('/friends').then(setFriends).catch(() => {});
  const loadRequests = () => api.get('/friends/requests').then(setRequests).catch(() => {});

  const searchFriend = async () => {
    setSearchError(''); setSearchResult(null);
    if (!searchEmail.trim()) return;
    setLoading(true);
    try {
      const data = await api.post('/friends/search', { email: searchEmail.trim() });
      setSearchResult(data);
    } catch (err) { setSearchError(err.error || 'User not found'); }
    finally { setLoading(false); }
  };

  const sendRequest = async (id) => {
    try {
      await api.post('/friends/request', { addressee_id: id });
      showToast('Friend request sent! 🎉');
      setSearchResult(r => ({ ...r, friendship_status: 'pending' }));
    } catch (err) { showToast(err.error || 'Error'); }
  };

  const acceptRequest = async (fid) => {
    await api.post('/friends/accept', { friendship_id: fid });
    loadFriends(); loadRequests();
    showToast('New buddy added! 🥂');
  };

  const declineRequest = async (fid) => {
    await api.post('/friends/decline', { friendship_id: fid });
    loadRequests();
  };

  const saveCity = async () => {
    await updateCity(cityInput);
    showToast('Location updated! 📍');
    setPanel(null);
  };

  const copyInviteLink = async () => {
    try {
      const { code } = await api.post('/invites');
      const link = `${window.location.origin}/invite/${code}`;
      await navigator.clipboard.writeText(link);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 3000);
    } catch { showToast('Could not generate link'); }
  };

  const startHangout = async (friendId) => {
    try {
      const data = await api.post('/hangouts/start', { partner_id: friendId });
      nav(`/hangout/${data.id}`);
    } catch { showToast('Could not start hangout'); }
  };

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const sortedFriends = [...friends].sort((a, b) => {
    const order = { free: 0, busy: 1, 'in-hangout': 2, offline: 3 };
    return (order[friendPresence[a.id]] ?? 3) - (order[friendPresence[b.id]] ?? 3);
  });

  const freeFriends = friends.filter(f => friendPresence[f.id] === 'free');
  const myPresenceOpt = PRESENCE_OPTIONS.find(o => o.key === myPresence) || PRESENCE_OPTIONS[0];

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto pb-8 relative overflow-x-hidden">

      {/* Background orbs */}
      <div className="orb w-96 h-96 -top-32 -right-24 pointer-events-none" style={{ background: '#8B5CF6', opacity: 0.22 }} />
      <div className="orb w-72 h-72 top-1/3 -left-24 pointer-events-none"  style={{ background: '#F472B6', opacity: 0.15 }} />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-6 pt-10 pb-2 flex items-center justify-between relative z-10">
        <div>
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-1">Welcome back</p>
          <h1 className="text-4xl font-display font-black grad-text leading-none">
            {user?.name?.split(' ')[0]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Requests bell */}
          <button onClick={() => setPanel('requests')}
            className="relative p-3 rounded-2xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Bell size={20} className="text-gray-300" />
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
                {requests.length}
              </span>
            )}
          </button>
          <button onClick={logout}
            className="p-3 rounded-2xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <LogOut size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── Distance vibe strip ────────────────────────────────── */}
      <div className="px-6 mt-3 relative z-10">
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { s: '✈️', label: 'distance' },
            { s: '🌍', label: 'anywhere' },
            { s: '🥂', label: 'together' },
            { s: '💫', label: 'joy' },
            { s: '❤️', label: 'always' },
          ].map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5"
              style={{
                opacity: 0.45,
                animation: `floatDrift ${6 + i * 0.8}s ease-in-out ${i * 0.6}s infinite`,
              }}>
              <span className="text-lg leading-none">{v.s}</span>
              <span className="text-gray-700 font-semibold" style={{ fontSize: '0.6rem', letterSpacing: '0.06em' }}>
                {v.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── My Presence card ────────────────────────────────────── */}
      <div className="px-6 mt-5 relative z-10">
        <button onClick={() => setPanel('presence')} className="w-full text-left rounded-3xl p-4 transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(255,255,255,0.08)`,
            backdropFilter: 'blur(20px)',
          }}>
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-widest mb-2">My Status</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
                style={{ background: `${myPresenceOpt.color}22`, border: `1px solid ${myPresenceOpt.color}44` }}>
                {myPresenceOpt.emoji}
              </div>
              <div>
                <p className="font-bold text-white text-base">{myPresenceOpt.label}</p>
                <p className="text-xs text-gray-500">{myPresenceOpt.hint}</p>
              </div>
            </div>
            <span className="text-xs text-gray-600 font-medium">tap to change →</span>
          </div>
        </button>
      </div>

      {/* ── Free friends alert ──────────────────────────────────── */}
      {freeFriends.length > 0 && (
        <div className="px-6 mt-4 fade-in relative z-10">
          <div className="rounded-3xl p-4" style={{
            background: 'rgba(16,185,129,0.07)',
            border: '1px solid rgba(16,185,129,0.2)',
            backdropFilter: 'blur(20px)',
          }}>
            <p className="text-green-400 font-bold text-base mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              {freeFriends.length === 1
                ? `${freeFriends[0].name.split(' ')[0]} is free right now!`
                : `${freeFriends.length} buddies are free right now!`}
            </p>
            <div className="flex flex-wrap gap-2">
              {freeFriends.map(f => (
                <button key={f.id} onClick={() => startHangout(f.id)}
                  className="flex items-center gap-2 font-bold rounded-2xl px-4 py-2.5 text-sm transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(16,185,129,0.3)',
                  }}>
                  <Zap size={14} fill="white" />
                  Hang with {f.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── City + quick actions row ─────────────────────────────── */}
      <div className="px-6 mt-4 flex gap-3 relative z-10">
        <button onClick={() => setPanel('city')}
          className="flex-1 flex items-center gap-2 rounded-2xl px-4 py-3 transition-all active:scale-[0.97] text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <MapPin size={15} style={{ color: '#EC4899' }} />
          <span className="text-gray-400 truncate">{user?.city || 'Set your city'}</span>
        </button>
        <button onClick={() => nav('/memories')}
          className="flex items-center gap-2 rounded-2xl px-4 py-3 transition-all active:scale-[0.97] text-sm font-semibold text-gray-300"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Clock size={15} style={{ color: '#7C3AED' }} />
          Memories
        </button>
      </div>

      {/* ── Friends list ────────────────────────────────────────── */}
      <div className="px-6 mt-6 flex-1 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold flex items-center gap-2 text-white">
            <Users size={18} style={{ color: '#7C3AED' }} />
            Your Crew
            {friends.length > 0 && (
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full text-gray-400"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                {friends.length}
              </span>
            )}
          </h2>
          <button onClick={() => setPanel('add')}
            className="flex items-center gap-2 font-bold rounded-2xl px-4 py-2.5 text-sm transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #F472B6)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(139,92,246,0.45)',
            }}>
            <UserPlus size={16} />
            Add
          </button>
        </div>

        {friends.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-6xl mb-5">👫</div>
            <p className="text-white font-display font-bold text-2xl mb-2">Your crew awaits</p>
            <p className="text-gray-500 mb-8 leading-relaxed">Add your college buddies and start hanging out from anywhere in the world</p>
            <button className="btn-primary mx-auto w-fit" onClick={() => setPanel('add')}>
              <UserPlus size={20} /> Add Your First Buddy
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedFriends.map(f => (
              <FriendCard
                key={f.id}
                friend={f}
                presence={friendPresence[f.id] || 'offline'}
                onHangOut={() => startHangout(f.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Slide-up panels ─────────────────────────────────────── */}
      {panel && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPanel(null)} />
          <div className="relative rounded-t-[2rem] p-6 slide-up max-w-lg mx-auto w-full max-h-[85vh] overflow-y-auto"
            style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
            <div className="w-12 h-1.5 rounded-full mx-auto mb-6"
              style={{ background: 'rgba(255,255,255,0.12)' }} />

            {/* ── Presence picker ── */}
            {panel === 'presence' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-display font-black text-white">Your Status</h3>
                <p className="text-gray-500">Your buddies see this in real time</p>
                {PRESENCE_OPTIONS.map((opt) => (
                  <button key={opt.key} onClick={() => setPresence(opt.key)}
                    className="flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
                    style={{
                      background: myPresence === opt.key ? `${opt.color}11` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${myPresence === opt.key ? `${opt.color}55` : 'rgba(255,255,255,0.07)'}`,
                    }}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${opt.color}22` }}>
                      {opt.emoji}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-white text-base">{opt.label}</p>
                      <p className="text-gray-500 text-sm">{opt.hint}</p>
                    </div>
                    {myPresence === opt.key && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: opt.grad }}>
                        <Check size={14} color="white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ── Add Friend ── */}
            {panel === 'add' && (
              <div className="flex flex-col gap-5">
                <h3 className="text-2xl font-display font-black text-white">Add a Buddy</h3>

                {/* ── Invite link — primary CTA ── */}
                <div className="rounded-2xl p-4" style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.25)' }}>
                  <p className="text-xs text-violet-400 font-bold uppercase tracking-widest mb-1">Invite via link</p>
                  <p className="text-gray-500 text-sm mb-3">Share on WhatsApp · they sign up · you're instantly connected 🥂</p>
                  <button
                    onClick={copyInviteLink}
                    className="w-full font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                    style={{ background: 'linear-gradient(135deg,#8B5CF6,#F472B6)', color: '#fff', boxShadow: '0 0 24px rgba(139,92,246,0.4)' }}>
                    <Link size={15} />
                    {inviteCopied ? '✅ Link copied! Send it now' : 'Copy Invite Link'}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  <span className="text-gray-600 text-xs font-semibold">or find by email</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                </div>

                <div className="flex gap-3">
                  <input className="input flex-1" type="email" placeholder="friend@email.com"
                    value={searchEmail}
                    onChange={e => { setSearchEmail(e.target.value); setSearchError(''); setSearchResult(null); }}
                    onKeyDown={e => e.key === 'Enter' && searchFriend()}
                    autoFocus />
                  <button className="btn-primary px-5 py-0 min-h-0 h-[58px]" onClick={searchFriend} disabled={loading}>
                    {loading
                      ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      : <Search size={20} />}
                  </button>
                </div>

                {searchError && (
                  <div className="rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <p className="text-red-400 font-bold">Not found 🔍</p>
                    <p className="text-red-500 text-sm mt-1">Make sure they've signed up to PRANA first.</p>
                  </div>
                )}

                {searchResult && (
                  <div className="rounded-2xl p-4 flex items-center gap-4"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="avatar" style={{ background: searchResult.user.avatar_color, width: 48, height: 48 }}>
                      {initials(searchResult.user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-base">{searchResult.user.name}</p>
                      <p className="text-gray-500 text-sm truncate">{searchResult.user.email}</p>
                    </div>
                    {!searchResult.friendship_status
                      ? <button className="btn-primary px-4 py-2 text-sm min-h-0 h-10" onClick={() => sendRequest(searchResult.user.id)}>Add</button>
                      : <span className="text-gray-400 text-sm font-semibold capitalize px-3 py-1 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {searchResult.friendship_status}
                        </span>}
                  </div>
                )}
              </div>
            )}

            {/* ── Friend Requests ── */}
            {panel === 'requests' && (
              <div className="flex flex-col gap-5">
                <h3 className="text-2xl font-display font-black text-white">Buddy Requests</h3>
                {requests.length === 0
                  ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="text-gray-500">No pending requests</p>
                    </div>
                  )
                  : requests.map(r => (
                    <div key={r.id} className="rounded-2xl p-4 flex items-center gap-4"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="avatar" style={{ background: r.avatar_color, width: 48, height: 48 }}>
                        {initials(r.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white">{r.name}</p>
                        <p className="text-gray-500 text-sm truncate">{r.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptRequest(r.id)}
                          className="p-2.5 rounded-xl transition-colors active:scale-95"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                          <Check size={18} />
                        </button>
                        <button onClick={() => declineRequest(r.id)}
                          className="p-2.5 rounded-xl transition-colors active:scale-95"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* ── City ── */}
            {panel === 'city' && (
              <div className="flex flex-col gap-5">
                <h3 className="text-2xl font-display font-black text-white">📍 Your City</h3>
                <p className="text-gray-500">Helps PRANA find the same spots in both your cities during hangouts</p>
                <input className="input" placeholder="e.g. New York, London, Mumbai..."
                  value={cityInput} onChange={e => setCityInput(e.target.value)} />
                <button className="btn-primary w-full" onClick={saveCity}>Save Location</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast notification ──────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl font-semibold text-white z-50 fade-in whitespace-nowrap"
          style={{
            background: 'rgba(15,15,30,0.95)',
            border: '1px solid rgba(139,92,246,0.4)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 30px rgba(139,92,246,0.2)',
          }}>
          {toast}
        </div>
      )}

      {/* ── Incoming hangout — full-screen call overlay ── */}
      {incomingHangout && (
        <IncomingHangout
          invite={incomingHangout}
          onJoin={() => { nav(`/hangout/${incomingHangout.hangoutId}`); setIncomingHangout(null); }}
          onDecline={() => setIncomingHangout(null)}
        />
      )}
    </div>
  );
}
