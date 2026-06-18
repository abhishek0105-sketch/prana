import { useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';

const initials = (name) =>
  name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

export default function IncomingHangout({ invite, onJoin, onDecline }) {
  const { from, participants } = invite;
  const timerRef = useRef(null);

  // Auto-decline after 30 seconds
  useEffect(() => {
    timerRef.current = setTimeout(onDecline, 30000);
    return () => clearTimeout(timerRef.current);
  }, []);

  const others = participants.filter(n => n !== from.name);
  const groupLabel = others.length > 0
    ? `${from.name} + ${others.join(', ')}`
    : from.name;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}>

      {/* Ambient glow rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[140, 190, 240].map((size, i) => (
          <div key={i} className="absolute rounded-full border"
            style={{
              width: size, height: size,
              borderColor: `rgba(0,180,255,${0.15 - i * 0.04})`,
              animation: `pulse ${1.4 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">

        {/* Caller avatar */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-black text-white"
            style={{
              background: from.color || 'linear-gradient(135deg,#00B4FF,#00E5A0)',
              boxShadow: '0 0 60px rgba(0,180,255,0.5), 0 0 120px rgba(0,180,255,0.2)',
            }}>
            {initials(from.name)}
          </div>
          {/* Live pulse dot */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center"
            style={{ background: '#10B981', borderColor: '#000' }}>
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
          </div>
        </div>

        {/* Call info */}
        <div>
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-widest mb-1">
            Incoming hangout 🥂
          </p>
          <h2 className="text-white text-3xl font-display font-black leading-tight">
            {from.name}
          </h2>
          {others.length > 0 && (
            <p className="text-gray-400 text-sm mt-2">
              with {others.join(', ')}
            </p>
          )}
        </div>

        {/* Participant pills */}
        {participants.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {participants.slice(0, 5).map((name, i) => (
              <div key={i}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#D1D5DB' }}>
                {name}
              </div>
            ))}
            {participants.length > 5 && (
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
                +{participants.length - 5} more
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-8 mt-4">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onDecline}
              className="w-18 h-18 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                width: 68, height: 68,
                background: 'rgba(239,68,68,0.15)',
                border: '2px solid rgba(239,68,68,0.35)',
              }}>
              <PhoneOff size={28} style={{ color: '#EF4444' }} />
            </button>
            <span className="text-gray-500 text-xs font-semibold">Not now</span>
          </div>

          {/* Join */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onJoin}
              className="rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                width: 68, height: 68,
                background: 'linear-gradient(135deg,#10B981,#059669)',
                boxShadow: '0 0 40px rgba(16,185,129,0.5)',
              }}>
              <Phone size={28} color="white" />
            </button>
            <span className="text-white font-bold text-sm">Join 🥂</span>
          </div>
        </div>

        <p className="text-gray-700 text-xs mt-2">Auto-declines in 30 seconds</p>
      </div>
    </div>
  );
}
