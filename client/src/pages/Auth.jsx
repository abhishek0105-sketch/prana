import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';

const PHOTOS = {
  // Friends laughing hard at a rooftop party — real faces, warm light, zero tech
  signup: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=90&auto=format&fit=crop',
  // Nightlife crowd energy — people celebrating, back in the world
  login:  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=85&auto=format&fit=crop&crop=center',
};

const PHOTO_POS = { signup: 'center 30%', login: 'center 38%' };

export default function Auth() {
  const [params]  = useSearchParams();
  const [mode, setMode]       = useState(params.get('mode') || 'login');
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register }   = useAuth();
  const nav = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const inviteCode = params.get('invite');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'signup') {
        if (!form.name.trim()) { setError('What should we call you?'); setLoading(false); return; }
        await register(form.name.trim(), form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
      if (inviteCode) await api.post(`/invites/${inviteCode}/redeem`).catch(() => {});
      nav('/home');
    } catch (err) {
      setError(err.error || 'Something went wrong. Try again.');
    } finally { setLoading(false); }
  };

  const isSignup = mode === 'signup';

  /* ─── Split: photo zone = top 50%, form zone = bottom 50% ─── */
  const SPLIT = 50;

  return (
    <div style={{
      width: '100%', height: '100dvh', position: 'relative',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: '#020C18',
      maxWidth: 480, margin: '0 auto',
    }}>

      {/* ── Background photo — only shows through top zone ── */}
      <img
        key={mode}
        src={PHOTOS[mode]}
        alt=""
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: `${SPLIT + 8}%`,          /* slightly taller so gradient covers the seam */
          width: '100%',
          objectFit: 'cover',
          objectPosition: PHOTO_POS[mode],
          /* warm up the signup photo with a gentle filter */
          filter: isSignup
            ? 'brightness(1.08) saturate(1.35) contrast(1.02)'
            : 'brightness(0.9) saturate(1.1)',
          transition: 'filter 0.5s ease',
        }}
      />

      {/* Gradient: crystal clear at top → pitch dark at SPLIT point */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: `${SPLIT + 8}%`,
        background: `linear-gradient(180deg,
          rgba(2,12,24,0.18) 0%,
          rgba(2,12,24,0.0)  22%,
          rgba(2,12,24,0.6)  ${SPLIT - 4}%,
          rgba(2,12,24,1.0)  ${SPLIT + 6}%
        )`,
      }} />

      {/* Neon divider line at the split */}
      <div style={{
        position: 'absolute', top: `${SPLIT}%`, left: 0, right: 0, height: 1, zIndex: 3,
        background: 'linear-gradient(90deg,transparent,#00B4FF 35%,#00E5A0 65%,transparent)',
        opacity: 0.5,
      }} />

      {/* ── PHOTO ZONE — logo + headline (top SPLIT%) ─────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: `${SPLIT}%`, zIndex: 2,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'max(18px,env(safe-area-inset-top,18px)) 22px 24px',
      }}>
        {/* Back button */}
        <button onClick={() => nav('/')} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'rgba(2,12,24,0.48)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 20, padding: '7px 14px 7px 10px',
          color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem',
          fontWeight: 600, cursor: 'pointer', width: 'fit-content',
        }}>
          <ArrowLeft size={15} /> Back
        </button>

        {/* Title + tagline — sit at bottom of photo zone */}
        <div>
          <div style={{
            fontFamily: '"Outfit","Inter",sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(2rem,8vw,2.9rem)',
            lineHeight: 1.05, color: '#fff',
            textShadow: '0 2px 24px rgba(0,0,0,0.6)',
          }}>
            {isSignup ? 'Join ' : 'Welcome '}
            <span style={{
              background: 'linear-gradient(90deg,#00B4FF,#00E5A0)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 16px rgba(0,180,255,0.55))',
            }}>
              {isSignup ? 'CLINK' : 'back'}
            </span>
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.72)',
            fontSize: '1rem', fontWeight: 500, marginTop: 7,
            fontFamily: '"Inter",sans-serif',
            textShadow: '0 1px 12px rgba(0,0,0,0.5)',
          }}>
            {isSignup ? 'Never lose your people.' : 'Your crew is waiting.'}
          </p>
        </div>
      </div>

      {/* ── FORM ZONE — starts cleanly at SPLIT% ──────────────── */}
      <div style={{
        position: 'absolute', top: `${SPLIT}%`, bottom: 0, left: 0, right: 0,
        zIndex: 2,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-evenly',
        padding: '18px 22px',
        paddingBottom: 'max(22px,env(safe-area-inset-bottom,22px))',
        overflowY: 'auto',
        background: '#020C18',
      }}>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

          {isSignup && (
            <div>
              <label style={labelStyle}>Your name</label>
              <input style={inputStyle} placeholder="What do your buddies call you?"
                value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" placeholder="you@example.com"
              value={form.email} onChange={set('email')} autoComplete="email" />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: 52 }}
                type={showPw ? 'text' : 'password'}
                placeholder="Min 8 characters"
                value={form.password} onChange={set('password')}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{
                position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 14,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#FCA5A5', fontSize: '0.85rem', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '16px 0', marginTop: 2,
            background: loading ? 'rgba(0,180,255,0.4)' : 'linear-gradient(135deg,#00B4FF,#00E5A0)',
            border: 'none', borderRadius: 18,
            color: '#020C18', fontFamily: '"Outfit","Inter",sans-serif',
            fontWeight: 900, fontSize: '1.05rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 32px rgba(0,180,255,0.35),0 4px 20px rgba(0,229,160,0.2)',
            position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {/* shimmer */}
            {!loading && (
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: '55%',
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)',
                animation: 'btnShimmer 2.8s ease-in-out infinite',
              }} />
            )}
            {loading
              ? <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: '2.5px solid rgba(2,12,24,0.3)',
                  borderTop: '2.5px solid #020C18',
                  animation: 'spin 0.7s linear infinite',
                }} />
              : <span style={{ position: 'relative', zIndex: 1 }}>
                  {isSignup ? 'Create My Account' : "Let's Go"}
                </span>
            }
          </button>
        </form>

        <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
          style={{
            marginTop: 18, background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.38)', fontSize: '0.85rem',
            fontWeight: 500, cursor: 'pointer', textAlign: 'center',
            fontFamily: '"Inter",sans-serif',
          }}>
          {isSignup ? 'Already have an account? Log in' : "New here? Sign up — it's free"}
        </button>
      </div>

      <style>{`
        @keyframes spin       { to { transform: rotate(360deg) } }
        @keyframes btnShimmer { 0% { transform:translateX(-120%) } 60%,100% { transform:translateX(280%) } }
      `}</style>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  color: 'rgba(255,255,255,0.38)',
  fontSize: '0.68rem', fontWeight: 700,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  marginBottom: 7, fontFamily: '"Inter",sans-serif',
};

const inputStyle = {
  width: '100%', padding: '14px 18px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 15, color: '#fff',
  fontSize: '0.95rem', fontFamily: '"Inter",sans-serif',
  outline: 'none', boxSizing: 'border-box',
  backdropFilter: 'blur(8px)',
};
