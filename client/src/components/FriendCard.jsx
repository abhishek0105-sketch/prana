import { Sparkles, MapPin, Flame, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/api';

const PRESENCE = {
  free:         { color: '#10B981', label: 'Free now',     pulse: true,  ring: 'rgba(16,185,129,0.5)'  },
  busy:         { color: '#EF4444', label: 'Busy',         pulse: false, ring: 'rgba(239,68,68,0.3)'   },
  'in-hangout': { color: '#F59E0B', label: 'In a hangout', pulse: true,  ring: 'rgba(245,158,11,0.5)'  },
  offline:      { color: '#4B5563', label: 'Offline',      pulse: false, ring: 'transparent'            },
};

export default function FriendCard({ friend, presence = 'offline', onHangOut }) {
  const [stats, setStats] = useState(null);
  const p = PRESENCE[presence] || PRESENCE.offline;
  const initials = friend.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isFree = presence === 'free';

  useEffect(() => {
    api.get(`/friends/stats/${friend.id}`).then(setStats).catch(() => {});
  }, [friend.id]);

  return (
    <div
      className="relative rounded-3xl p-4 transition-all duration-300 overflow-hidden"
      style={{
        background: isFree
          ? 'rgba(16,185,129,0.06)'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isFree ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
        backdropFilter: 'blur(20px)',
        boxShadow: isFree ? '0 0 30px rgba(16,185,129,0.08)' : 'none',
      }}
    >
      {/* Subtle gradient shimmer for free friends */}
      {isFree && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, transparent 60%)' }} />
      )}

      <div className="flex items-center gap-4 relative z-10">
        {/* Avatar with glowing presence ring */}
        <div className="relative flex-shrink-0">
          <div
            className="avatar text-lg"
            style={{
              background: friend.avatar_color,
              width: 54, height: 54,
              boxShadow: p.pulse ? `0 0 0 3px ${p.ring}, 0 0 20px ${p.ring}` : `0 0 0 2px rgba(255,255,255,0.08)`,
            }}
          >
            {initials}
          </div>
          {/* Presence dot */}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{
              background: p.color,
              border: '2px solid #08080F',
              boxShadow: p.pulse ? `0 0 8px ${p.color}` : 'none',
            }}
          >
            {p.pulse && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-60"
                style={{ background: p.color }} />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg text-white leading-tight truncate">{friend.name}</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: p.color }}>{p.label}</p>
          {friend.city && (
            <p className="text-gray-600 text-xs flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {friend.city}
            </p>
          )}
        </div>

        {/* Hang Out button */}
        <button
          onClick={onHangOut}
          className="flex items-center gap-2 font-bold rounded-2xl px-4 py-3 text-sm transition-all active:scale-95 flex-shrink-0"
          style={isFree ? {
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff',
            boxShadow: '0 0 20px rgba(16,185,129,0.4), 0 4px 12px rgba(16,185,129,0.2)',
          } : {
            background: 'linear-gradient(135deg, #8B5CF6, #F472B6)',
            color: '#fff',
            boxShadow: '0 0 20px rgba(139,92,246,0.3), 0 4px 12px rgba(236,72,153,0.15)',
          }}
        >
          {isFree ? <Zap size={16} fill="white" /> : <Sparkles size={16} />}
          {isFree ? 'Join!' : 'Hang Out'}
        </button>
      </div>

      {/* Stats strip */}
      {stats && stats.totalHangouts > 0 && (
        <div className="flex items-center gap-4 mt-3 pt-3 relative z-10"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Sparkles size={11} className="text-violet-400" />
            <span><span className="text-white font-bold">{stats.totalHangouts}</span> hangouts</span>
          </div>
          {stats.streak > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Flame size={11} className="text-orange-400" />
              <span><span className="text-white font-bold">{stats.streak}</span>-day streak</span>
            </div>
          )}
          {stats.onThisDay?.length > 0 && (
            <div className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
              ✨ On this day
            </div>
          )}
        </div>
      )}
    </div>
  );
}
