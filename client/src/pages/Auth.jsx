import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff, Plane, Heart, Wine, Smile, Globe, Star } from 'lucide-react';

const AUTH_FLOATERS = [
  { Icon: Plane,  top: 12, left:  6, size: 20, op: 0.10, dur: 7,  delay: 0   },
  { Icon: Globe,  top: 20, left: 85, size: 18, op: 0.09, dur: 9,  delay: 1.5 },
  { Icon: Smile,  top: 50, left:  4, size: 19, op: 0.10, dur: 8,  delay: 0.8 },
  { Icon: Heart,  top: 65, left: 88, size: 17, op: 0.09, dur: 10, delay: 2.0 },
  { Icon: Wine,   top: 80, left: 10, size: 18, op: 0.09, dur: 7,  delay: 3.0 },
  { Icon: Star,   top: 38, left: 90, size: 16, op: 0.09, dur: 9,  delay: 1.2 },
];

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode]       = useState(params.get('mode') || 'login');
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register }   = useAuth();
  const nav = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

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
      nav('/home');
    } catch (err) {
      setError(err.error || 'Something went wrong. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col px-6 py-8 relative overflow-hidden">
      {/* Orbs */}
      <div className="orb w-80 h-80 -top-24 -right-24" style={{ background: '#8B5CF6' }} />
      <div className="orb w-72 h-72 bottom-0 -left-24" style={{ background: '#F472B6' }} />

      {/* Floating outline sketch symbols */}
      {AUTH_FLOATERS.map(({ Icon, top, left, size, op, dur, delay }, i) => (
        <div key={i} className="absolute pointer-events-none select-none"
          style={{
            top: `${top}%`, left: `${left}%`,
            opacity: op,
            animation: `floatDrift ${dur}s ease-in-out ${delay}s infinite`,
          }}>
          <Icon size={size} stroke="white" strokeWidth={1.2} fill="none" />
        </div>
      ))}

      <button onClick={() => nav('/')} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors w-fit relative z-10">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full gap-8 fade-in relative z-10">

        <div>
          <div className="text-5xl mb-4">{mode === 'login' ? '👋' : '✨'}</div>
          <h2 className="text-4xl font-display font-black grad-text">
            {mode === 'login' ? 'Welcome back' : 'Join PRANA'}
          </h2>
          <p className="text-gray-400 mt-2 text-lg">
            {mode === 'login' ? 'Your crew is waiting.' : 'Never lose your people.'}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label className="text-gray-400 font-semibold block mb-2 text-sm uppercase tracking-wide">Your name</label>
              <input className="input" placeholder="What do your buddies call you?" value={form.name}
                onChange={set('name')} autoComplete="name" />
            </div>
          )}
          <div>
            <label className="text-gray-400 font-semibold block mb-2 text-sm uppercase tracking-wide">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email}
              onChange={set('email')} autoComplete="email" />
          </div>
          <div>
            <label className="text-gray-400 font-semibold block mb-2 text-sm uppercase tracking-wide">Password</label>
            <div className="relative">
              <input className="input pr-14" type={showPw ? 'text' : 'password'}
                placeholder="Min 6 characters" value={form.password} onChange={set('password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl px-5 py-4 text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full mt-2 text-lg font-display" disabled={loading}>
            {loading
              ? <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : mode === 'login' ? 'Let\'s Go 🚀' : 'Create My Account ✨'}
          </button>
        </form>

        <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
          className="text-gray-500 hover:text-white transition-colors text-sm font-medium text-center">
          {mode === 'login'
            ? "New here? Sign up — it's free"
            : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
