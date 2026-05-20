import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wine, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../lib/api';

const AMOUNTS = [5, 10, 15, 20, 50];
const MESSAGES = ['🥂 Cheers!', '🍺 This one\'s on me!', '☕ Coffee on me!', '🍕 Enjoy!', '❤️ Just because'];

export default function SendRound() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [hangout, setHangout] = useState(null);
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('🥂 Cheers!');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/hangouts/${id}`).then(d => setHangout(d.hangout)).catch(() => nav('/home'));
  }, [id]);

  const friend = hangout
    ? (hangout.initiator_id === user?.id
      ? { id: hangout.partner_id, name: hangout.partner_name, color: hangout.partner_color }
      : { id: hangout.initiator_id, name: hangout.initiator_name, color: hangout.initiator_color })
    : null;

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  const send = async () => {
    if (!friend || !finalAmount) return;
    setError(''); setLoading(true);
    try {
      const data = await api.post('/payments/send', {
        receiver_id: friend.id,
        amount: finalAmount,
        message,
        hangout_id: id
      });
      socket?.emit('round-sent', {
        hangoutId: id,
        amount: finalAmount,
        message,
        receiver_name: friend.name
      });
      setSent(true);
    } catch (err) { setError(err.error || 'Could not send round'); }
    finally { setLoading(false); }
  };

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (sent) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 fade-in">
      <div className="text-7xl mb-6 animate-bounce">🥂</div>
      <h2 className="text-3xl font-black text-center mb-3">Round Sent!</h2>
      <p className="text-gray-400 text-center text-lg mb-2">
        You sent <span className="text-primary font-bold">${finalAmount}</span> to {friend?.name}
      </p>
      <p className="text-gray-500 text-center mb-8">"{message}"</p>
      <button className="btn-primary w-full max-w-xs" onClick={() => nav(-1)}>
        Back to Hangout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-6 py-8 fade-in">
      <button onClick={() => nav(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
          <Wine size={24} color="#07070F" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Buy a Round</h1>
          <p className="text-gray-400">Pay for your friend's drink or meal</p>
        </div>
      </div>

      {/* Friend card */}
      {friend && (
        <div className="card flex items-center gap-4 mb-6">
          <div className="avatar" style={{ background: friend.color }}>{initials(friend.name)}</div>
          <div>
            <p className="text-gray-400 text-sm">Sending to</p>
            <p className="font-bold text-xl">{friend.name}</p>
          </div>
        </div>
      )}

      {/* Amount selector */}
      <div className="mb-6">
        <label className="text-gray-300 font-semibold block mb-3 text-base">Choose amount</label>
        <div className="flex gap-3 flex-wrap mb-4">
          {AMOUNTS.map(a => (
            <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
              className={`flex-1 py-4 rounded-2xl font-bold text-lg border transition-all min-w-16 ${amount === a && !customAmount ? 'bg-primary text-black border-primary' : 'bg-surface border-border text-white hover:border-primary'}`}>
              ${a}
            </button>
          ))}
        </div>
        <input className="input" type="number" placeholder="Or enter custom amount..."
          value={customAmount} onChange={e => setCustomAmount(e.target.value)} min="1" max="500" />
      </div>

      {/* Message */}
      <div className="mb-8">
        <label className="text-gray-300 font-semibold block mb-3 text-base">Add a message</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {MESSAGES.map(m => (
            <button key={m} onClick={() => setMessage(m)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${message === m ? 'bg-primary text-black border-primary' : 'bg-surface border-border text-gray-300 hover:border-primary'}`}>
              {m}
            </button>
          ))}
        </div>
        <input className="input" placeholder="Or write your own..." value={message}
          onChange={e => setMessage(e.target.value)} maxLength={100} />
      </div>

      {error && <p className="text-red-400 font-medium mb-4">{error}</p>}

      <button className="btn-primary w-full" onClick={send} disabled={loading || !finalAmount}>
        {loading
          ? <div className="w-6 h-6 rounded-full border-2 border-black border-t-transparent animate-spin" />
          : <><Send size={20} /> Send ${finalAmount || '?'} to {friend?.name?.split(' ')[0]}</>}
      </button>

      <p className="text-gray-600 text-sm text-center mt-4">
        This is a virtual gesture — connect your payment method in settings to send real money
      </p>
    </div>
  );
}
