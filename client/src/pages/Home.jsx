import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Bell, LogOut, MapPin, Search, Check, X,
         Zap, Link, Clock, ChevronRight, Play } from 'lucide-react';
import { useAuth }   from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api           from '../lib/api';
import FriendCard    from '../components/FriendCard';
import IncomingHangout from '../components/IncomingHangout';
import usePushNotifications from '../hooks/usePushNotifications';

/* ── Presence ─────────────────────────────────────────────────── */
const PRESENCE_OPTIONS = [
  { key: 'free',       emoji: '🟢', label: "I'm Free",     hint: "Crew can see you're available",  color: '#10B981', grad: 'linear-gradient(135deg,#10B981,#059669)' },
  { key: 'busy',       emoji: '🔴', label: "I'm Busy",      hint: "Crew knows you're unavailable",   color: '#EF4444', grad: 'linear-gradient(135deg,#EF4444,#DC2626)' },
  { key: 'in-hangout', emoji: '🟡', label: 'In a Hangout', hint: "You're currently hanging out",    color: '#F59E0B', grad: 'linear-gradient(135deg,#F59E0B,#D97706)' },
];

/* ── Photo-backed action tiles ────────────────────────────────── */
const TILES = [
  {
    icon: '🎬', label: 'Watch Together', sub: 'Same movie, different cities',
    img:     'https://images.unsplash.com/photo-1489599849927-9b44e0e2ce9e?w=700&q=80&auto=format&fit=crop',
    overlay: 'linear-gradient(170deg,rgba(0,0,40,.15) 0%,rgba(0,0,0,.80) 100%)',
    accent:  '#00B4FF', tall: true, route: null,
  },
  {
    icon: '🗺️', label: 'Find a Spot', sub: 'Best place near both of you',
    img:     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=80&auto=format&fit=crop',
    overlay: 'linear-gradient(170deg,rgba(0,0,0,.10) 0%,rgba(0,0,0,.82) 100%)',
    accent:  '#00E5A0', tall: false, route: null,
  },
  {
    icon: '🥂', label: 'Toast!', sub: 'Cheers from anywhere',
    img:     'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=500&q=80&auto=format&fit=crop',
    overlay: 'linear-gradient(170deg,rgba(0,0,0,.10) 0%,rgba(0,0,0,.82) 100%)',
    accent:  '#FBBF24', tall: false, route: null,
  },
];

/* ── Film strip lifestyle photos ──────────────────────────────── */
const STRIP = [
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=200&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1484863137850-59afcfe05386?w=200&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502872364588-894d7d6ddfab?w=200&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=60&auto=format&fit=crop',
];

const initials = n => n?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

export default function Home() {
  const { user, logout, updateCity } = useAuth();
  const socket = useSocket();
  const nav    = useNavigate();
  const [searchParams] = useSearchParams();
  usePushNotifications();

  const [friends,         setFriends]         = useState([]);
  const [requests,        setRequests]        = useState([]);
  const [friendPresence,  setFriendPresence]  = useState({});
  const [myPresence,      setMyPresence]      = useState('free');
  const myPresenceRef                         = useRef('free');
  const [panel,           setPanel]           = useState(null);
  const [searchEmail,     setSearchEmail]     = useState('');
  const [searchResult,    setSearchResult]    = useState(null);
  const [searchError,     setSearchError]     = useState('');
  const [cityInput,       setCityInput]       = useState(user?.city || '');
  const [loading,         setLoading]         = useState(false);
  const [toast,           setToast]           = useState('');
  const [inviteCopied,    setInviteCopied]    = useState(false);
  const [inviteLink,      setInviteLink]      = useState('');
  const [incomingHangout, setIncomingHangout] = useState(null);

  useEffect(() => { loadFriends(); loadRequests(); }, []);

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      setPanel('add');
      nav('/home', { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit('get-friend-presence');
    socket.emit('set-presence', myPresence);
    socket.on('friend-presence-map', m => setFriendPresence(m));
    socket.on('presence-update', ({ userId, status }) => setFriendPresence(p => ({ ...p, [userId]: status })));
    socket.on('friend-request',  ()         => { loadRequests(); showToast('📩 New buddy request!'); });
    socket.on('friend-accepted', ({ name }) => { loadFriends(); showToast(`🥂 ${name} joined your crew!`); });
    socket.on('hangout-invite',  invite     => setIncomingHangout(invite));
    socket.on('reconnect', () => { socket.emit('get-friend-presence'); socket.emit('set-presence', myPresenceRef.current); });
    return () => ['friend-presence-map','presence-update','friend-request','friend-accepted','hangout-invite','reconnect'].forEach(e => socket.off(e));
  }, [socket]);

  const setPresence  = s  => { myPresenceRef.current = s; setMyPresence(s); socket?.emit('set-presence', s); setPanel(null); };
  const showToast    = m  => { setToast(m); setTimeout(() => setToast(''), 3000); };
  const loadFriends  = () => api.get('/friends').then(setFriends).catch(() => {});
  const loadRequests = () => api.get('/friends/requests').then(setRequests).catch(() => {});

  const searchFriend   = async () => { setSearchError(''); setSearchResult(null); if (!searchEmail.trim()) return; setLoading(true); try { setSearchResult(await api.post('/friends/search', { email: searchEmail.trim() })); } catch (e) { setSearchError(e.error || 'User not found'); } finally { setLoading(false); } };
  const sendRequest    = async id  => { try { await api.post('/friends/request', { addressee_id: id }); showToast('Request sent! 🎉'); setSearchResult(r => ({ ...r, friendship_status: 'pending' })); } catch (e) { showToast(e.error || 'Error'); } };
  const acceptRequest  = async fid => { try { await api.post('/friends/accept',  { friendship_id: fid }); loadFriends(); loadRequests(); showToast('New buddy added! 🥂'); } catch { showToast('Could not accept'); } };
  const declineRequest = async fid => { try { await api.post('/friends/decline', { friendship_id: fid }); loadRequests(); } catch { showToast('Could not decline'); } };
  const saveCity       = async ()  => { await updateCity(cityInput); showToast('Location saved! 📍'); setPanel(null); };
  const startHangout   = async id  => { try { const d = await api.post('/hangouts/start', { partner_id: id }); nav(`/hangout/${d.id}`); } catch { showToast('Could not start hangout'); } };

  const copyInviteLink = async () => {
    let link;
    try { const { code } = await api.post('/invites'); link = `${window.location.origin}/invite/${code}`; } catch { showToast('Could not generate link'); return; }
    if (navigator.share) { try { await navigator.share({ title: 'Join me on CLINK 🥂', text: "Hey! Join me on CLINK 🥂", url: link }); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 3000); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(link); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 3000); } catch { setInviteLink(link); }
  };

  const sortedFriends = [...friends].sort((a, b) => ({ free:0, busy:1, 'in-hangout':2, offline:3 }[friendPresence[a.id]??'offline'] ?? 3) - ({ free:0, busy:1, 'in-hangout':2, offline:3 }[friendPresence[b.id]??'offline'] ?? 3));
  const freeFriends   = friends.filter(f => friendPresence[f.id] === 'free');
  const myPOpt        = PRESENCE_OPTIONS.find(o => o.key === myPresence) || PRESENCE_OPTIONS[0];

  /* ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto pb-24 overflow-x-hidden" style={{ background: '#020C18', position: 'relative' }}>

      {/* Fixed atmospheric background photo — subtle, behind all content */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        maxWidth: 480, margin: '0 auto', left: 0, right: 0,
      }}>
        <img
          src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&q=60&auto=format&fit=crop&crop=center"
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 40%',
            filter: 'blur(4px) brightness(0.28) saturate(1.4)',
            transform: 'scale(1.06)',
          }}
        />
        {/* Extra dark overlay so content is clearly readable */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg,rgba(2,12,24,0.55) 0%,rgba(2,12,24,0.35) 40%,rgba(2,12,24,0.7) 100%)',
        }} />
      </div>

      {/* All page content sits above the fixed background */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* ══════════ CINEMATIC HERO ══════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ height: 270 }}>

        {/* Full-bleed photo */}
        <img
          src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=900&q=90&auto=format&fit=crop&crop=faces,center"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 15%', filter: 'brightness(1.1) saturate(1.3) contrast(1.02)' }}
        />

        {/* Multi-layer dark overlay for readability */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,12,24,0.25) 0%, rgba(2,12,24,0.0) 30%, rgba(2,12,24,0.7) 100%)' }} />

        {/* Neon bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(0,180,255,0.6),rgba(0,229,160,0.6),transparent)' }} />

        {/* ── Top bar ── */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12 z-10">
          {/* Avatar + greeting */}
          <button onClick={() => setPanel('presence')} className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white"
                style={{ background: user?.avatar_color || 'linear-gradient(135deg,#00B4FF,#00E5A0)', boxShadow: `0 0 0 2.5px #020C18, 0 0 0 4px ${myPOpt.color}, 0 0 16px ${myPOpt.color}88` }}>
                {initials(user?.name)}
              </div>
              {myPresence === 'free' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background:'#10B981', border:'2px solid #020C18' }}>
                  <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background:'#10B981' }} />
                </span>
              )}
            </div>
            <div>
              <p style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.5)', letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:700 }}>hey there</p>
              <p className="font-display font-black text-white text-xl leading-none" style={{ textShadow:'0 2px 12px rgba(0,0,0,0.5)' }}>
                {user?.name?.split(' ')[0]} 👋
              </p>
            </div>
          </button>

          {/* Action icons */}
          <div className="flex items-center gap-2">
            <button onClick={() => setPanel('requests')} className="relative w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background:'rgba(2,12,24,0.55)', border:'1px solid rgba(255,255,255,0.15)', backdropFilter:'blur(12px)' }}>
              <Bell size={17} className="text-white" />
              {requests.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-xs font-black" style={{ background:'linear-gradient(135deg,#00B4FF,#00E5A0)', color:'#020C18' }}>
                  {requests.length}
                </span>
              )}
            </button>
            <button onClick={logout} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background:'rgba(2,12,24,0.55)', border:'1px solid rgba(255,255,255,0.10)', backdropFilter:'blur(12px)' }}>
              <LogOut size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* ── Hero bottom content ── */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
          <p className="font-display font-black text-white leading-none" style={{ fontSize: '2rem', textShadow:'0 2px 24px rgba(0,0,0,0.6)' }}>
            Your crew is<br/>
            <span className="grad-text">always one clink away.</span>
          </p>
          <div className="flex items-center justify-between mt-3">
            {/* Crew pile */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {friends.slice(0, 5).map((f, i) => (
                  <div key={f.id} className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white" style={{ background: f.avatar_color || 'linear-gradient(135deg,#00B4FF,#00E5A0)', border:'2px solid rgba(2,12,24,0.8)', marginLeft: i > 0 ? -6 : 0, zIndex: 10-i }}>
                    {initials(f.name)}
                  </div>
                ))}
              </div>
              {friends.length > 0 && <p style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.55)', fontWeight:600 }}>{friends.length} in crew</p>}
            </div>
            {/* Status + city */}
            <div className="flex items-center gap-2">
              <button onClick={() => setPanel('city')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl" style={{ background:'rgba(2,12,24,0.55)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.1)' }}>
                <MapPin size={10} style={{ color:'#00E5A0' }} />
                <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.55)', fontWeight:600 }}>{user?.city || 'Set city'}</span>
              </button>
              <button onClick={() => setPanel('presence')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold" style={{ background:`${myPOpt.color}22`, border:`1px solid ${myPOpt.color}55`, color:myPOpt.color, backdropFilter:'blur(12px)' }}>
                {myPOpt.emoji} {myPOpt.label}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ FILM STRIP ════════════════════════════════════ */}
      <div className="relative z-10 overflow-hidden" style={{ height: 64 }}>
        <div className="flex gap-1.5 animate-none" style={{ display:'flex', paddingLeft:16, paddingRight:16, paddingTop:10, paddingBottom:10, gap:8, overflowX:'auto', scrollbarWidth:'none' }}>
          {[...STRIP, ...STRIP].map((src, i) => (
            <div key={i} className="flex-shrink-0 rounded-xl overflow-hidden relative" style={{ width:44, height:44 }}>
              <img src={src} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 rounded-xl" style={{ boxShadow:'inset 0 0 0 1px rgba(0,180,255,0.2)' }} />
            </div>
          ))}
        </div>
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none" style={{ background:'linear-gradient(90deg,#020C18,transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none" style={{ background:'linear-gradient(-90deg,#020C18,transparent)' }} />
      </div>

      {/* ══════════ LIVE NOW (stories) ════════════════════════════ */}
      {freeFriends.length > 0 && (
        <div className="px-5 py-3 relative z-10 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <p style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', color:'#10B981' }}>Live now</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'rgba(16,185,129,0.15)', color:'#10B981', border:'1px solid rgba(16,185,129,0.3)' }}>
              {freeFriends.length} free
            </span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
            {freeFriends.map(f => (
              <button key={f.id} onClick={() => startHangout(f.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-90 transition-all">
                <div className="relative" style={{ padding:3 }}>
                  <div className="absolute inset-0 rounded-full animate-spin" style={{ background:'conic-gradient(from 0deg,#10B981,#00B4FF,#00E5A0,#FBBF24,#10B981)', animationDuration:'2.5s' }} />
                  <div className="relative w-[66px] h-[66px] rounded-full flex items-center justify-center font-black text-white text-xl" style={{ background: f.avatar_color || 'linear-gradient(135deg,#00B4FF,#00E5A0)', border:'3px solid #020C18' }}>
                    {initials(f.name)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center z-10" style={{ background:'linear-gradient(135deg,#10B981,#00B4FF)', border:'2.5px solid #020C18' }}>
                    <Zap size={11} fill="#020C18" color="#020C18" />
                  </div>
                </div>
                <p className="text-xs font-bold text-white truncate max-w-[70px]">{f.name.split(' ')[0]}</p>
                <p style={{ fontSize:'0.58rem', color:'#10B981', fontWeight:700 }}>tap to hang</p>
              </button>
            ))}
            {/* Add shortcut */}
            <button onClick={() => setPanel('add')} className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-90 transition-all">
              <div className="w-[66px] h-[66px] rounded-full flex items-center justify-center" style={{ background:'rgba(0,180,255,0.07)', border:'2px dashed rgba(0,180,255,0.3)' }}>
                <UserPlus size={22} style={{ color:'#00B4FF' }} />
              </div>
              <p className="text-xs font-bold text-gray-600">Add</p>
            </button>
          </div>
        </div>
      )}

      {/* ══════════ SECTION LABEL ═════════════════════════════════ */}
      <div className="px-5 pt-2 pb-3 flex items-center justify-between relative z-10">
        <p style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>
          Things to do 🔥
        </p>
        <button onClick={() => setPanel('add')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all active:scale-90" style={{ background:'linear-gradient(135deg,#00B4FF,#00E5A0)', color:'#020C18', boxShadow:'0 0 16px rgba(0,180,255,0.4)' }}>
          <UserPlus size={12} /> Add buddy
        </button>
      </div>

      {/* ══════════ MAGAZINE GRID ═════════════════════════════════ */}
      <div className="px-4 relative z-10">

        {/* Row 1 — asymmetric: big left + 2 stacked right */}
        <div className="flex gap-2" style={{ height: 280 }}>

          {/* WATCH TOGETHER — tall left card */}
          <button
            className="relative flex-shrink-0 rounded-3xl overflow-hidden active:scale-[0.97] transition-all"
            style={{ width:'58%' }}
          >
            <img src={TILES[0].img} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: TILES[0].overlay }} />
            {/* Neon border */}
            <div className="absolute inset-0 rounded-3xl" style={{ boxShadow:`inset 0 0 0 1.5px ${TILES[0].accent}50` }} />
            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background:`${TILES[0].accent}25`, border:`1px solid ${TILES[0].accent}50` }}>
                <Play size={17} fill={TILES[0].accent} color={TILES[0].accent} />
              </div>
              <div>
                <p className="text-3xl mb-2">{TILES[0].icon}</p>
                <p className="font-display font-black text-white text-lg leading-tight">{TILES[0].label}</p>
                <p style={{ fontSize:'0.7rem', color:`${TILES[0].accent}dd`, fontWeight:600, marginTop:3 }}>{TILES[0].sub}</p>
              </div>
            </div>
          </button>

          {/* Right column — 2 stacked */}
          <div className="flex flex-col gap-2 flex-1">
            {TILES.slice(1).map(t => (
              <button key={t.label}
                onClick={() => t.route && nav(t.route)}
                className="relative flex-1 rounded-3xl overflow-hidden active:scale-[0.97] transition-all"
              >
                <img src={t.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: t.overlay }} />
                <div className="absolute inset-0 rounded-3xl" style={{ boxShadow:`inset 0 0 0 1.5px ${t.accent}50` }} />
                <div className="absolute inset-0 flex flex-col justify-end p-3.5">
                  <p className="text-2xl mb-1">{t.icon}</p>
                  <p className="font-display font-black text-white text-sm leading-none">{t.label}</p>
                  <p style={{ fontSize:'0.6rem', color:`${t.accent}dd`, fontWeight:700, marginTop:2 }}>{t.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2 — Cast to TV — full-width cinematic bar */}
        <button onClick={() => nav('/tv')}
          className="relative w-full rounded-3xl overflow-hidden mt-2 active:scale-[0.98] transition-all flex items-center"
          style={{ height: 88 }}>
          <img
            src="https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=75&auto=format&fit=crop"
            alt="" className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background:'linear-gradient(90deg,rgba(2,12,24,0.88) 0%,rgba(20,0,60,0.60) 60%,rgba(80,40,160,0.30) 100%)' }} />
          <div className="absolute inset-0 rounded-3xl" style={{ boxShadow:'inset 0 0 0 1.5px rgba(167,139,250,0.40)' }} />
          <div className="relative z-10 flex items-center gap-4 px-5 w-full">
            <span className="text-3xl">📺</span>
            <div>
              <p className="font-display font-black text-white text-base leading-none">Cast to TV</p>
              <p style={{ fontSize:'0.68rem', color:'rgba(167,139,250,0.9)', fontWeight:600, marginTop:3 }}>Send video to your big screen</p>
            </div>
            <div className="ml-auto">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'rgba(167,139,250,0.2)', border:'1px solid rgba(167,139,250,0.35)' }}>
                <ChevronRight size={16} style={{ color:'#A78BFA' }} />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* ══════════ YOUR CREW ══════════════════════════════════════ */}
      <div className="px-4 mt-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <p style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>Your crew</p>
            {friends.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'rgba(0,180,255,0.1)', color:'#00B4FF', border:'1px solid rgba(0,180,255,0.2)' }}>
                {friends.length}
              </span>
            )}
          </div>
          <button onClick={() => nav('/memories')} className="flex items-center gap-1.5 text-xs font-bold" style={{ color:'rgba(255,255,255,0.3)' }}>
            <Clock size={11} style={{ color:'#FBBF24' }} /> Memories
          </button>
        </div>

        {friends.length === 0 ? (
          /* ── Empty state ── */
          <div className="relative rounded-3xl overflow-hidden text-center" style={{ background:'rgba(0,180,255,0.05)', border:'1px solid rgba(0,180,255,0.12)' }}>
            <img
              src="https://images.unsplash.com/photo-1474523651-0e9e4c8ebbdc?w=700&q=70&auto=format&fit=crop&crop=center"
              alt="" className="w-full object-cover" style={{ height:160, opacity:0.3 }}
            />
            <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center p-6">
              <p className="font-display font-black text-3xl text-white mb-1" style={{ textShadow:'0 2px 16px rgba(0,0,0,0.6)' }}>
                Find your people
              </p>
              <p className="text-gray-400 text-sm mb-5 leading-relaxed max-w-xs">
                Same vibe, different cities. Add your crew and start hanging out 🌍
              </p>
              <button className="btn-primary mx-auto mb-2 text-sm py-3 px-6 min-h-0 h-auto" onClick={() => setPanel('add')}>
                <UserPlus size={16} /> Add Your First Buddy
              </button>
              <button onClick={copyInviteLink} className="flex items-center justify-center gap-2 py-2 text-sm font-semibold" style={{ color:'rgba(0,180,255,0.65)' }}>
                <Link size={13} /> or share an invite link
              </button>
            </div>
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
            {/* Invite more */}
            <button onClick={() => setPanel('add')}
              className="w-full flex items-center justify-between rounded-3xl px-5 py-4 mt-1 transition-all active:scale-[0.98]"
              style={{ background:'rgba(0,180,255,0.04)', border:'1px dashed rgba(0,180,255,0.18)' }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">➕</span>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Grow your crew</p>
                  <p className="text-gray-600 text-xs">Invite more friends via link</p>
                </div>
              </div>
              <ChevronRight size={15} style={{ color:'rgba(0,180,255,0.4)' }} />
            </button>
          </div>
        )}
      </div>

      {/* ══════════ PANELS ════════════════════════════════════════ */}
      {panel && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPanel(null)} />
          <div className="relative rounded-t-[2rem] p-6 slide-up max-w-lg mx-auto w-full max-h-[85vh] overflow-y-auto glass-panel" style={{ borderBottom:'none' }}>
            <div className="w-12 h-1.5 rounded-full mx-auto mb-6" style={{ background:'rgba(255,255,255,0.12)' }} />

            {/* Presence */}
            {panel === 'presence' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-display font-black text-white">Your Vibe ⚡</h3>
                <p className="text-gray-500">Your crew sees this in real time</p>
                {PRESENCE_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => setPresence(opt.key)}
                    className="flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
                    style={{ background: myPresence === opt.key ? `${opt.color}12` : 'rgba(255,255,255,0.03)', border:`1px solid ${myPresence === opt.key ? `${opt.color}55` : 'rgba(255,255,255,0.07)'}` }}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ background:`${opt.color}20` }}>{opt.emoji}</div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-white text-base">{opt.label}</p>
                      <p className="text-gray-500 text-sm">{opt.hint}</p>
                    </div>
                    {myPresence === opt.key && <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background:opt.grad }}><Check size={14} color="white" /></div>}
                  </button>
                ))}
              </div>
            )}

            {/* Add buddy */}
            {panel === 'add' && (
              <div className="flex flex-col gap-5">
                <h3 className="text-2xl font-display font-black text-white">Add a Buddy</h3>
                <div className="rounded-2xl p-4" style={{ background:'rgba(0,180,255,0.08)', border:'1px solid rgba(0,180,255,0.2)' }}>
                  <p style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'#00B4FF', marginBottom:4 }}>Invite via link</p>
                  <p className="text-gray-500 text-sm mb-3">Share on WhatsApp · they sign up · instantly connected 🥂</p>
                  <button onClick={copyInviteLink} className="w-full font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]" style={{ background:'linear-gradient(135deg,#00B4FF,#00E5A0)', color:'#020C18', boxShadow:'0 0 24px rgba(0,180,255,0.4)' }}>
                    <Link size={15} />{inviteCopied ? "✅ Shared! They'll join soon" : navigator.share ? 'Share Invite Link' : 'Copy Invite Link'}
                  </button>
                  {inviteLink && (
                    <div className="mt-3 rounded-xl p-3 flex gap-2" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
                      <p className="text-xs text-gray-400 flex-1 break-all font-mono">{inviteLink}</p>
                      <button onClick={() => { navigator.clipboard.writeText(inviteLink).catch(()=>{}); setInviteCopied(true); setInviteLink(''); setTimeout(()=>setInviteCopied(false),3000); }} className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background:'rgba(0,180,255,0.2)', color:'#00E5A0' }}>Copy</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3"><div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.07)' }} /><span className="text-gray-600 text-xs font-semibold">or find by email</span><div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.07)' }} /></div>
                <div className="flex gap-3">
                  <input className="input flex-1" type="email" placeholder="friend@email.com" value={searchEmail} onChange={e => { setSearchEmail(e.target.value); setSearchError(''); setSearchResult(null); }} onKeyDown={e => e.key==='Enter' && searchFriend()} autoFocus />
                  <button className="btn-primary px-5 py-0 min-h-0 h-[58px]" onClick={searchFriend} disabled={loading}>
                    {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Search size={20} />}
                  </button>
                </div>
                {searchError && <div className="rounded-2xl px-4 py-3" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}><p className="text-red-400 font-bold">Not found 🔍</p><p className="text-red-500 text-sm mt-1">Make sure they've signed up to CLINK first.</p></div>}
                {searchResult && (
                  <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    <div className="avatar" style={{ background:searchResult.user.avatar_color, width:48, height:48 }}>{initials(searchResult.user.name)}</div>
                    <div className="flex-1 min-w-0"><p className="font-bold text-white text-base">{searchResult.user.name}</p><p className="text-gray-500 text-sm truncate">{searchResult.user.email}</p></div>
                    {!searchResult.friendship_status
                      ? <button className="btn-primary px-4 py-2 text-sm min-h-0 h-10" onClick={() => sendRequest(searchResult.user.id)}>Add</button>
                      : <span className="text-gray-400 text-sm font-semibold capitalize px-3 py-1 rounded-xl" style={{ background:'rgba(255,255,255,0.06)' }}>{searchResult.friendship_status}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Requests */}
            {panel === 'requests' && (
              <div className="flex flex-col gap-5">
                <h3 className="text-2xl font-display font-black text-white">Buddy Requests</h3>
                {requests.length === 0
                  ? <div className="text-center py-12"><div className="text-4xl mb-3">📭</div><p className="text-gray-500">No pending requests</p></div>
                  : requests.map(r => (
                    <div key={r.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                      <div className="avatar" style={{ background:r.avatar_color, width:48, height:48 }}>{initials(r.name)}</div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-white">{r.name}</p><p className="text-gray-500 text-sm truncate">{r.email}</p></div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptRequest(r.id)} className="p-2.5 rounded-xl active:scale-95" style={{ background:'rgba(16,185,129,0.15)', color:'#10B981', border:'1px solid rgba(16,185,129,0.3)' }}><Check size={18} /></button>
                        <button onClick={() => declineRequest(r.id)} className="p-2.5 rounded-xl active:scale-95" style={{ background:'rgba(239,68,68,0.1)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.25)' }}><X size={18} /></button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* City */}
            {panel === 'city' && (
              <div className="flex flex-col gap-5">
                <h3 className="text-2xl font-display font-black text-white">📍 Your City</h3>
                <p className="text-gray-500">Helps find the same spots in both cities</p>
                <input className="input" placeholder="e.g. New York, London, Mumbai..." value={cityInput} onChange={e => setCityInput(e.target.value)} />
                <button className="btn-primary w-full" onClick={saveCity}>Save Location</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ TOAST ══════════════════════════════════════════ */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl font-semibold text-white z-50 fade-in whitespace-nowrap"
          style={{ background:'rgba(2,12,24,0.96)', border:'1px solid rgba(0,180,255,0.4)', backdropFilter:'blur(20px)', boxShadow:'0 0 30px rgba(0,180,255,0.2)' }}>
          {toast}
        </div>
      )}

      {/* ══════════ INCOMING HANGOUT ═══════════════════════════════ */}
      {incomingHangout && (
        <IncomingHangout
          invite={incomingHangout}
          onJoin={() => { nav(`/hangout/${incomingHangout.hangoutId}`); setIncomingHangout(null); }}
          onDecline={() => setIncomingHangout(null)}
        />
      )}
      </div>{/* end zIndex:1 content wrapper */}
    </div>
  );
}
