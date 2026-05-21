import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Plane, Heart, Wine, Smile } from 'lucide-react';

const FLOATERS = [
  { Icon: Plane,  top: 10, left:  8, size: 20, op: 0.10, dur: 8,  delay: 0   },
  { Icon: Heart,  top: 25, left: 85, size: 18, op: 0.09, dur: 9,  delay: 1.2 },
  { Icon: Smile,  top: 60, left:  5, size: 19, op: 0.10, dur: 7,  delay: 0.8 },
  { Icon: Wine,   top: 78, left: 82, size: 17, op: 0.09, dur: 10, delay: 2.0 },
];

const AVATAR_COLORS = [
  'linear-gradient(135deg,#8B5CF6,#F472B6)',
  'linear-gradient(135deg,#F472B6,#FBBF24)',
  'linear-gradient(135deg,#2DD4BF,#8B5CF6)',
];

const initials = (name) =>
  name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

export default function Invite() {
  const { code }      = useParams();
  const { user }      = useAuth();
  const nav           = useNavigate();

  const [inviter,    setInviter]    = useState(null);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [redeeming,  setRedeeming]  = useState(false);

  useEffect(() => {
    api.get(`/invites/${code}`)
      .then(data  => setInviter(data.inviter))
      .catch(err  => setError(err.error || 'Invalid or expired invite link'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    if (user) {
      // Already signed in — redeem and go home
      setRedeeming(true);
      try {
        await api.post(`/invites/${code}/redeem`);
        nav('/home');
      } catch (err) {
        setError(err.error || 'Could not connect');
        setRedeeming(false);
      }
    } else {
      nav(`/auth?mode=signup&invite=${code}`);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Orbs */}
      <div className="orb w-96 h-96 -top-32 -right-20" style={{ background: '#8B5CF6' }} />
      <div className="orb w-72 h-72 -bottom-16 -left-20" style={{ background: '#F472B6' }} />

      {/* Ambient floaters */}
      {FLOATERS.map(({ Icon, top, left, size, op, dur, delay }, i) => (
        <div key={i} className="absolute pointer-events-none select-none"
          style={{ top: `${top}%`, left: `${left}%`, opacity: op,
            animation: `floatDrift ${dur}s ease-in-out ${delay}s infinite` }}>
          <Icon size={size} stroke="white" strokeWidth={1.2} fill="none" />
        </div>
      ))}

      <div className="relative z-10 w-full max-w-sm fade-in text-center flex flex-col items-center gap-8">

        {/* PRANA logo */}
        <div>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #F472B6)',
              boxShadow: '0 0 50px rgba(139,92,246,0.5)',
            }}>✨</div>
          <p className="text-2xl font-display font-black grad-text tracking-tight">PRANA</p>
        </div>

        {loading && (
          <div className="w-10 h-10 rounded-full border-4 border-violet border-t-transparent animate-spin" />
        )}

        {!loading && error && (
          <div className="w-full rounded-3xl p-6 text-center"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="text-4xl mb-3">😕</div>
            <p className="text-red-400 font-bold text-lg">Link no longer valid</p>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
            <button className="btn-secondary w-full mt-5" onClick={() => nav('/')}>
              Go to PRANA
            </button>
          </div>
        )}

        {!loading && inviter && (
          <>
            {/* Inviter card */}
            <div className="w-full rounded-3xl p-6 flex flex-col items-center gap-4"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                backdropFilter: 'blur(20px)',
              }}>

              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black text-white"
                style={{ background: inviter.avatar_color || AVATAR_COLORS[0] }}>
                {initials(inviter.name)}
              </div>

              <div>
                <p className="text-white font-display font-black text-2xl">{inviter.name}</p>
                <p className="text-gray-500 text-sm mt-1">invited you to PRANA</p>
              </div>

              <div className="w-full rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <p className="text-violet-300 text-sm leading-relaxed">
                  Stay close to your crew, no matter<br />how far life takes you ✨
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="w-full flex flex-col gap-3">
              <button className="btn-primary w-full text-lg font-display" onClick={handleJoin} disabled={redeeming}>
                {redeeming
                  ? <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : user
                    ? `Add ${inviter.name.split(' ')[0]} to my crew 🥂`
                    : 'Join PRANA — Free Forever ✨'}
              </button>
              {!user && (
                <button className="btn-secondary w-full" onClick={() => nav(`/auth?mode=login&invite=${code}`)}>
                  Already have an account? Log in
                </button>
              )}
            </div>

            <p className="text-gray-700 text-xs">No ads · No algorithm · Just your people</p>
          </>
        )}
      </div>
    </div>
  );
}
