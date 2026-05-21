import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Plane, Globe, Heart, Wine, Smile, Music, Star, Users, Handshake, Sun } from 'lucide-react';

// Cycling feature popups — appear one at a time, float up, fade out
const FEATURES = [
  { emoji: '🎬', title: 'Watch together',      sub: 'Same movie, different cities',     side: 'left'  },
  { emoji: '🍕', title: 'Order together',       sub: 'Same franchise, your city',        side: 'right' },
  { emoji: '🥂', title: 'Toast together',       sub: 'Synchronized cheers, anywhere',    side: 'left'  },
  { emoji: '🗺️', title: 'Find your spot',       sub: 'Best place near both of you',      side: 'right' },
  { emoji: '🔥', title: '12-day streak',        sub: 'You & Ravi are on fire 🔥',        side: 'left'  },
  { emoji: '💸', title: 'Send a round',         sub: 'Aryan just bought you a drink 🍺', side: 'right' },
  { emoji: '💌', title: 'Always together',      sub: 'Distance is just a number',        side: 'left'  },
  { emoji: '✈️', title: 'Different cities',     sub: 'Same feeling, every time',         side: 'right' },
];

// Outline sketch ambient symbols
const FLOATERS = [
  { Icon: Plane,     top:  7, left:  6, size: 22, op: 0.13, dur: 8,  delay: 0   },
  { Icon: Globe,     top: 10, left: 84, size: 20, op: 0.11, dur: 10, delay: 1.4, rev: true },
  { Icon: Heart,     top: 24, left:  4, size: 18, op: 0.12, dur: 7,  delay: 0.6 },
  { Icon: Smile,     top: 20, left: 88, size: 20, op: 0.11, dur: 9,  delay: 2.2, rev: true },
  { Icon: Wine,      top: 42, left:  3, size: 18, op: 0.12, dur: 11, delay: 3.1 },
  { Icon: Music,     top: 38, left: 90, size: 17, op: 0.10, dur: 8,  delay: 1.7, rev: true },
  { Icon: Users,     top: 58, left:  5, size: 20, op: 0.11, dur: 9,  delay: 2.5 },
  { Icon: Star,      top: 62, left: 87, size: 17, op: 0.12, dur: 7,  delay: 0.9, rev: true },
  { Icon: Handshake, top: 76, left:  7, size: 22, op: 0.10, dur: 10, delay: 4.0 },
  { Icon: Sun,       top: 80, left: 83, size: 19, op: 0.11, dur: 8,  delay: 1.5, rev: true },
];

export default function Welcome() {
  const nav = useNavigate();
  const [idx, setIdx]         = useState(0);
  const [visible, setVisible] = useState(true);

  // Cycle features: show 2.5s → fade out 0.4s → next → fade in
  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % FEATURES.length);
        setVisible(true);
      }, 420);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const f = FEATURES[idx];

  return (
    <div className="h-screen bg-bg flex flex-col relative overflow-hidden">

      {/* Background orbs */}
      <div className="orb w-96 h-96 -top-20 -left-20"  style={{ background: '#8B5CF6' }} />
      <div className="orb w-80 h-80 -bottom-10 -right-10" style={{ background: '#F472B6' }} />
      <div className="orb w-72 h-72 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ background: '#FBBF24', opacity: 0.10 }} />

      {/* Floating outline symbols */}
      {FLOATERS.map(({ Icon, top, left, size, op, dur, delay, rev }, i) => (
        <div key={i} className="absolute pointer-events-none select-none"
          style={{
            top: `${top}%`, left: `${left}%`, opacity: op,
            animation: `${rev ? 'floatDriftR' : 'floatDrift'} ${dur}s ease-in-out ${delay}s infinite`,
          }}>
          <Icon size={size} stroke="white" strokeWidth={1.2} fill="none" />
        </div>
      ))}

      {/* ── Top: Logo ────────────────────────────────────────────── */}
      <div className="flex flex-col items-center pt-16 px-6 relative z-10">
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl animate-float"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #F472B6)',
              boxShadow: '0 0 70px rgba(139,92,246,0.7), 0 0 140px rgba(244,114,182,0.3)',
            }}>
            ✨
          </div>
          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold"
            style={{ animation: 'orbit 3s linear infinite', boxShadow: '0 0 14px #FBBF24' }} />
        </div>
        <h1 className="text-7xl font-display font-black tracking-tight grad-text leading-none">PRANA</h1>
        <p className="text-gray-500 text-sm font-medium mt-2 tracking-wide text-center">
          For the crew that moved cities but never moved on
        </p>
      </div>

      {/* ── Middle: Headline ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10 gap-8">

        <div className="text-center">
          <p className="text-white text-3xl font-display font-black leading-tight">
            Friendships don't fade from fights.
          </p>
          <p className="text-3xl font-display font-black leading-tight grad-text mt-1">
            They fade from silence.
          </p>
          <p className="text-gray-500 text-base mt-4 leading-relaxed">
            Somewhere out there, your person is missing you too.
          </p>
        </div>

        {/* ── Cycling feature popup ─────────────────────────────── */}
        <div className="w-full flex px-2"
          style={{ justifyContent: f.side === 'left' ? 'flex-start' : 'flex-end' }}>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[72%]"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              opacity:   visible ? 1 : 0,
              transform: visible ? 'translateY(0px) scale(1)' : 'translateY(10px) scale(0.97)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}>
            <span className="text-2xl flex-shrink-0">{f.emoji}</span>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{f.title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{f.sub}</p>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {FEATURES.map((_, i) => (
            <div key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width:   i === idx ? 18 : 6,
                height:  6,
                background: i === idx
                  ? 'linear-gradient(90deg, #8B5CF6, #F472B6)'
                  : 'rgba(255,255,255,0.15)',
              }} />
          ))}
        </div>
      </div>

      {/* ── Bottom: Social proof + CTAs ──────────────────────────── */}
      <div className="px-6 pb-10 flex flex-col gap-3 relative z-10">

        {/* Social proof */}
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="flex -space-x-2">
            {['#8B5CF6','#F472B6','#FBBF24','#2DD4BF','#F87171'].map((c, i) => (
              <div key={i}
                className="w-7 h-7 rounded-full border-2 border-bg flex items-center justify-center text-xs font-black"
                style={{ background: c }}>
                {['R','A','S','P','M'][i]}
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-xs">
            <span className="text-gray-400 font-semibold">Hundreds</span> of buddies kept close
          </p>
        </div>

        <button
          className="btn-primary w-full text-lg font-display"
          onClick={() => nav('/auth?mode=signup')}>
          Get Started — Free Forever
        </button>
        <button
          className="btn-secondary w-full text-base"
          onClick={() => nav('/auth?mode=login')}>
          I already have an account
        </button>

        <p className="text-gray-800 text-xs text-center mt-1">
          No ads · No algorithm · Just your people
        </p>
      </div>
    </div>
  );
}
