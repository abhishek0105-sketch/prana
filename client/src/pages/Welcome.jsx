import { useNavigate } from 'react-router-dom';
import { Plane, Globe, Heart, Wine, Smile, Music, Star, Users, Handshake, Sun } from 'lucide-react';

const FEATURES = [
  { emoji: '🎬', text: 'Watch movies in sync' },
  { emoji: '🍕', text: 'Order from the same place' },
  { emoji: '🥂', text: 'Toast from different cities' },
  { emoji: '🗺️', text: 'Find your spot, in both cities' },
  { emoji: '🔥', text: 'Keep your streak alive' },
  { emoji: '💸', text: 'Buy each other drinks' },
];

// Outline sketch symbols — distance · love · cheers · smiles
// No color, stroke-only, gentle float
const FLOATERS = [
  { Icon: Plane,     top:  7,  left:  6,  size: 22, op: 0.13, dur: 8,  delay: 0,   rev: false },
  { Icon: Globe,     top: 10,  left: 84,  size: 20, op: 0.11, dur: 10, delay: 1.4, rev: true  },
  { Icon: Heart,     top: 24,  left:  4,  size: 18, op: 0.12, dur: 7,  delay: 0.6, rev: false },
  { Icon: Smile,     top: 20,  left: 88,  size: 20, op: 0.11, dur: 9,  delay: 2.2, rev: true  },
  { Icon: Wine,      top: 42,  left:  3,  size: 18, op: 0.12, dur: 11, delay: 3.1, rev: false },
  { Icon: Music,     top: 38,  left: 90,  size: 17, op: 0.10, dur: 8,  delay: 1.7, rev: true  },
  { Icon: Users,     top: 58,  left:  5,  size: 20, op: 0.11, dur: 9,  delay: 2.5, rev: false },
  { Icon: Star,      top: 62,  left: 87,  size: 17, op: 0.12, dur: 7,  delay: 0.9, rev: true  },
  { Icon: Handshake, top: 76,  left:  7,  size: 22, op: 0.10, dur: 10, delay: 4.0, rev: false },
  { Icon: Sun,       top: 80,  left: 83,  size: 19, op: 0.11, dur: 8,  delay: 1.5, rev: true  },
];

export default function Welcome() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">

      {/* Background orbs */}
      <div className="orb w-96 h-96 -top-20 -left-20"  style={{ background: '#8B5CF6' }} />
      <div className="orb w-80 h-80 -bottom-10 -right-10" style={{ background: '#F472B6' }} />
      <div className="orb w-72 h-72 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ background: '#FBBF24', opacity: 0.12 }} />

      {/* Floating outline sketch symbols */}
      {FLOATERS.map(({ Icon, top, left, size, op, dur, delay, rev }, i) => (
        <div key={i} className="absolute pointer-events-none select-none"
          style={{
            top: `${top}%`, left: `${left}%`,
            opacity: op,
            animation: `${rev ? 'floatDriftR' : 'floatDrift'} ${dur}s ease-in-out ${delay}s infinite`,
          }}>
          <Icon size={size} stroke="white" strokeWidth={1.2} fill="none" />
        </div>
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full gap-10 fade-in">

        {/* Logo */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl animate-float"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #F472B6)',
                boxShadow: '0 0 70px rgba(139,92,246,0.7), 0 0 140px rgba(244,114,182,0.35)',
              }}>
              ✨
            </div>
            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold"
              style={{ animation: 'orbit 3s linear infinite', boxShadow: '0 0 14px #FBBF24' }} />
          </div>
          <div className="text-center">
            <h1 className="text-7xl font-display font-black tracking-tight grad-text">PRANA</h1>
            <p className="text-gray-400 text-base mt-2 font-medium leading-relaxed">
              For the crew that moved cities<br />but never moved on
            </p>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center">
          <p className="text-white text-2xl font-bold leading-snug">
            Your college people are out there.<br />
            <span className="grad-text">Don't lose them.</span>
          </p>
        </div>

        {/* Feature pills */}
        <div className="w-full overflow-hidden -mx-6 px-6">
          <div className="flex gap-3 flex-wrap justify-center">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-gray-300"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span>{f.emoji}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full">
          <button className="btn-primary w-full text-xl font-display" onClick={() => nav('/auth?mode=signup')}>
            Get Started — Free Forever
          </button>
          <button className="btn-secondary w-full text-base" onClick={() => nav('/auth?mode=login')}>
            I already have an account
          </button>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-3 text-center">
          <div className="flex -space-x-2">
            {['#8B5CF6','#F472B6','#FBBF24','#2DD4BF','#F87171'].map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-bg flex items-center justify-center text-xs font-black"
                style={{ background: c }}>
                {['R','A','S','P','M'][i]}
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm">
            <span className="text-white font-semibold">Hundreds</span> of friendships kept alive
          </p>
        </div>

        <p className="text-gray-700 text-xs text-center">No ads · No algorithm · Just your people</p>
      </div>
    </div>
  );
}
