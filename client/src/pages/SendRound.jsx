import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Wine, ExternalLink, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../lib/api';

const AMOUNTS  = [5, 10, 15, 20, 50];
const MESSAGES = [
  '🥂 Cheers!',
  "🍺 This one's on me!",
  '☕ Coffee on me!',
  '🍕 Enjoy!',
  '❤️ Just because',
];

const initials = (name) =>
  name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

export default function SendRound() {
  const { id }       = useParams();
  const nav          = useNavigate();
  const { user }     = useAuth();
  const socket       = useSocket();
  const [params]     = useSearchParams();

  const [hangout,      setHangout]      = useState(null);
  const [amount,       setAmount]       = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [message,      setMessage]      = useState('🥂 Cheers!');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  // Did Stripe just redirect us back with ?paid=1?
  const returnPaid     = params.get('paid') === '1';
  const returnTo       = params.get('to')   || '';
  const returnAmt      = parseFloat(params.get('amt')) || 0;
  const [paid, setPaid] = useState(returnPaid);

  useEffect(() => {
    api.get(`/hangouts/${id}`).then(d => setHangout(d.hangout)).catch(() => nav('/home'));
  }, [id]);

  // Emit socket notification once hangout + socket are ready after a successful payment
  useEffect(() => {
    if (!paid || !hangout || !socket || !returnAmt) return;
    socket.emit('round-sent', {
      hangoutId: id,
      amount:    returnAmt,
      message,
      receiver_name: returnTo,
    });
    // Clean up the URL params so a refresh doesn't re-trigger
    window.history.replaceState({}, '', window.location.pathname);
  }, [paid, hangout, socket]);

  const friend = hangout
    ? (hangout.initiator_id === user?.id
      ? { id: hangout.partner_id,   name: hangout.partner_name,   color: hangout.partner_color }
      : { id: hangout.initiator_id, name: hangout.initiator_name, color: hangout.initiator_color })
    : null;

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  const sendRound = async () => {
    if (!friend || !finalAmount) return;
    setError(''); setLoading(true);
    try {
      // Try real Stripe checkout first
      const data = await api.post('/payments/checkout', {
        receiver_id: friend.id,
        amount:      finalAmount,
        message,
        hangout_id:  id,
      });
      window.location.href = data.url;
    } catch (err) {
      if (err.error === 'Payments not configured yet') {
        // Stripe not set up — fall back to virtual gesture
        try {
          await api.post('/payments/send', {
            receiver_id: friend.id,
            amount:      finalAmount,
            message,
            hangout_id:  id,
          });
          socket?.emit('round-sent', { hangoutId: id, amount: finalAmount, message, receiver_name: friend.name });
          setPaid(true);
        } catch (e) {
          setError(e.error || 'Could not send round');
        }
      } else {
        setError(err.error || 'Could not create payment session');
      }
      setLoading(false);
    }
  };

  // ── Success screen (returned from Stripe) ──────────────────────
  if (paid) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 fade-in relative overflow-hidden">
      <div className="orb w-72 h-72 -top-20 -left-20" style={{ background: '#F59E0B', opacity: 0.12 }} />
      <div className="orb w-72 h-72 -bottom-20 -right-20" style={{ background: '#F472B6', opacity: 0.12 }} />

      <div className="relative z-10 text-center flex flex-col items-center gap-5 max-w-sm">
        <div className="text-8xl animate-bounce">🥂</div>
        <div>
          <h2 className="text-4xl font-display font-black text-white mb-2">Round sent!</h2>
          <p className="text-gray-400 text-lg">
            You sent <span className="font-black" style={{ color: '#FBBF24' }}>${returnAmt}</span> to {returnTo}
          </p>
          <p className="text-gray-500 mt-1">"{message}"</p>
        </div>
        <div className="w-full rounded-3xl p-5 text-center"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-amber-400 text-sm font-semibold">
            {returnTo} will get a notification. They'll feel the love 💛
          </p>
        </div>
        <button className="btn-primary w-full text-lg font-display" onClick={() => nav(`/hangout/${id}`)}>
          Back to Hangout
        </button>
        <button className="text-gray-600 text-sm" onClick={() => { setPaid(false); setCustomAmount(''); }}>
          Send another round
        </button>
      </div>
    </div>
  );

  // ── Send form ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-6 py-8 fade-in relative overflow-x-hidden">

      <div className="orb w-72 h-72 -top-20 -right-20" style={{ background: '#8B5CF6', opacity: 0.15 }} />

      <button onClick={() => nav(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 relative z-10">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 0 30px rgba(245,158,11,0.35)' }}>
          <Wine size={26} color="#07070F" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-black text-white">Buy a Round</h1>
          <p className="text-gray-500 text-sm">Real payment · straight to their heart 🥂</p>
        </div>
      </div>

      {/* Who you're sending to */}
      {friend && (
        <div className="rounded-3xl p-4 flex items-center gap-4 mb-6 relative z-10"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg flex-shrink-0"
            style={{ background: friend.color }}>
            {initials(friend.name)}
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">Sending to</p>
            <p className="font-display font-bold text-xl text-white">{friend.name}</p>
          </div>
        </div>
      )}

      {/* Amount */}
      <div className="mb-6 relative z-10">
        <label className="text-gray-400 font-semibold block mb-3 text-sm uppercase tracking-widest">Amount</label>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {AMOUNTS.map(a => (
            <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
              className="py-4 rounded-2xl font-bold text-base transition-all active:scale-95"
              style={amount === a && !customAmount ? {
                background: 'linear-gradient(135deg,#8B5CF6,#F472B6)',
                color: '#fff',
                boxShadow: '0 0 16px rgba(139,92,246,0.4)',
              } : {
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#D1D5DB',
              }}>
              ${a}
            </button>
          ))}
        </div>
        <input className="input" type="number" placeholder="Custom amount..."
          value={customAmount} onChange={e => setCustomAmount(e.target.value)} min="1" max="500" />
      </div>

      {/* Message */}
      <div className="mb-8 relative z-10">
        <label className="text-gray-400 font-semibold block mb-3 text-sm uppercase tracking-widest">Message</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {MESSAGES.map(m => (
            <button key={m} onClick={() => setMessage(m)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={message === m ? {
                background: 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.4)',
                color: '#A78BFA',
              } : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#9CA3AF',
              }}>
              {m}
            </button>
          ))}
        </div>
        <input className="input" placeholder="Or write your own..." value={message}
          onChange={e => setMessage(e.target.value)} maxLength={100} />
      </div>

      {error && (
        <div className="rounded-2xl px-4 py-3 mb-4 relative z-10"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-red-400 text-sm font-semibold">{error}</p>
        </div>
      )}

      <button
        className="btn-primary w-full text-lg font-display relative z-10"
        onClick={sendRound}
        disabled={loading || !finalAmount || finalAmount < 1}>
        {loading
          ? <><Loader size={20} className="animate-spin" /> Opening Stripe…</>
          : <><ExternalLink size={18} /> Send ${finalAmount || '?'} to {friend?.name?.split(' ')[0]}</>}
      </button>

      <p className="text-gray-700 text-xs text-center mt-4 relative z-10">
        Real payments powered by Stripe — coming soon
      </p>
    </div>
  );
}
