import { Sparkles, MapPin, Flame, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/api';

const PRESENCE = {
  free:         { color: '#10B981', label: 'Free now',     pulse: true,  ring: 'rgba(16,185,129,0.5)'  },
  busy:         { color: '#EF4444', label: 'Busy',         pulse: false, ring: 'rgba(239,68,68,0.3)'   },
  'in-hangout': { color: '#F59E0B', label: 'In a hangout', pulse: true,  ring: 'rgba(245,158,11,0.5)'  },
  offline:      { color: '#374151', label: 'Offline',      pulse: false, ring: 'transparent'            },
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
      className="relative rounded-3xl p-4 transition-all duration-200 overflow-hidden active:scale-[0.99]"
      style={{
        background: isFree
          ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(0,180,255,0.05) 100%)'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isFree ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
        backdropFilter: 'blur(20px)',
        boxShadow: isFree ? '0 0 40px rgba(16,185,129,0.07)' : 'none',
      }}
    >
      {/* Subtle shimmer for free friends */}
      {isFree && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(0,180,255,0.03) 100%)' }} />
      )}

      <div className="flex items-center gap-4 relative z-10">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white"
            style={{
              background: friend.avatar_color,
              boxShadow: p.pulse
                ? `0 0 0 2px #020C18, 0 0 0 4px ${p.color}, 0 0 20px ${p.ring}`
                : `0 0 0 2px rgba(255,255,255,0.07)`,
            }}
          >
            {initials}
          </div>
          {/* Presence dot */}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full"
            style={{
              background: p.color,
              border: '2.5px solid #020C18',
              boxShadow: p.pulse ? `0 0 8px ${p.color}` : 'none',
            }}
          >
            {p.pulse && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-50"
                style={{ background: p.color }} />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-base leading-tight truncate">{friend.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold" style={{ color: p.color }}>{p.label}</span>
            {friend.city && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-gray-600 text-xs flex items-center gap-0.5">
                  <MapPin size={9} /> {friend.city}
                </span>
              </>
            )}
          </div>
          {/* Stats mini-row */}
          {stats && stats.totalHangouts > 0 && (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Sparkles size={9} style={{ color: '#00B4FF' }} />
                <span className="text-gray-500 font-semibold">{stats.totalHangouts}</span>
              </span>
              {stats.streak > 0 && (
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <Flame size={9} className="text-orange-400" />
                  <span className="text-orange-400 font-bold">{stats.streak}🔥</span>
                </span>
              )}
              {stats.onThisDay?.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}>
                  ✨ today
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hang Out button */}
        <button
          onClick={onHangOut}
          className="flex items-center gap-1.5 font-black rounded-2xl px-4 py-3 text-sm transition-all active:scale-90 flex-shrink-0"
          style={isFree ? {
            background: 'linear-gradient(135deg,#10B981,#00B4FF)',
            color: '#020C18',
            boxShadow: '0 0 24px rgba(16,185,129,0.5), 0 4px 16px rgba(16,185,129,0.25)',
          } : {
            background: 'linear-gradient(135deg,#00B4FF,#00E5A0)',
            color: '#020C18',
            boxShadow: '0 0 16px rgba(0,180,255,0.25)',
          }}
        >
          {isFree
            ? <><Zap size={15} fill="#020C18" />Join!</>
            : <><Sparkles size={15} />Hang</>}
        </button>
      </div>
    </div>
  );
}
