import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const nav = useNavigate();

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);

  if (!token) {
    return (
      <div style={wrapStyle}>
        <p style={{ color: '#FCA5A5', textAlign: 'center' }}>
          Invalid reset link. Please request a new one.
        </p>
        <button onClick={() => nav('/auth?mode=login')} style={linkBtn}>Go to login</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => nav('/auth?mode=login'), 2500);
    } catch (err) {
      setError(err.error || 'Link expired or invalid. Request a new one.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      background: '#020C18', padding: '0 24px', boxSizing: 'border-box',
      maxWidth: 480, margin: '0 auto',
    }}>
      <div style={{ width: '100%' }}>
        <div style={{
          fontFamily: '"Outfit","Inter",sans-serif', fontWeight: 900,
          fontSize: 'clamp(1.8rem,7vw,2.5rem)', color: '#fff',
          marginBottom: 6,
        }}>
          New{' '}
          <span style={{
            background: 'linear-gradient(90deg,#00B4FF,#00E5A0)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            password
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', marginBottom: 28 }}>
          Choose something you'll remember.
        </p>

        {success ? (
          <div style={{
            padding: '16px', borderRadius: 14,
            background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)',
            color: '#6EE7B7', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center',
          }}>
            Password updated! Redirecting to login…
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>New password</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingRight: 52 }}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            <div>
              <label style={labelStyle}>Confirm password</label>
              <input
                style={inputStyle}
                type={showPw ? 'text' : 'password'}
                placeholder="Same password again"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: 14,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#FCA5A5', fontSize: '0.85rem', fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px 0', marginTop: 4,
              background: loading ? 'rgba(0,180,255,0.4)' : 'linear-gradient(135deg,#00B4FF,#00E5A0)',
              border: 'none', borderRadius: 18,
              color: '#020C18', fontFamily: '"Outfit","Inter",sans-serif',
              fontWeight: 900, fontSize: '1.05rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {loading
                ? <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: '2.5px solid rgba(2,12,24,0.3)',
                    borderTop: '2.5px solid #020C18',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                : 'Set new password'
              }
            </button>
          </form>
        )}

        <button onClick={() => nav('/auth?mode=login')} style={linkBtn}>
          Back to log in
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

const wrapStyle = {
  width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column',
  justifyContent: 'center', alignItems: 'center', background: '#020C18',
  padding: '0 24px', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', color: 'rgba(255,255,255,0.38)',
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
};

const linkBtn = {
  marginTop: 20, background: 'none', border: 'none',
  color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem',
  fontWeight: 500, cursor: 'pointer', width: '100%',
  textAlign: 'center', fontFamily: '"Inter",sans-serif',
};
