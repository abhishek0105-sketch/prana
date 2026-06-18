import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const NOTIFS = [
  { avatar: 'RA', color: 'linear-gradient(135deg,#00B4FF,#00E5A0)', text: 'Ravi sent you a round 🥂', sub: '$10 — on me!',                    story: 'round'  },
  { avatar: 'AS', color: 'linear-gradient(135deg,#FBBF24,#00E5A0)', text: 'Alex is free right now! 🟢', sub: 'Tap to hang out',               story: 'free'   },
  { avatar: 'PR', color: 'linear-gradient(135deg,#00E5A0,#0070F3)', text: 'Movie night starting 🎬',    sub: '3... 2... 1... pressing play',   story: 'watch'  },
  { avatar: 'MY', color: 'linear-gradient(135deg,#A78BFA,#00B4FF)', text: 'Maya found a spot 📍',       sub: 'Zaza Bistro — near both of you', story: 'place'  },
  { avatar: 'KV', color: 'linear-gradient(135deg,#FBBF24,#F59E0B)', text: '12-day streak 🔥',           sub: 'You & Karan are on fire',        story: 'streak' },
  { avatar: 'SO', color: 'linear-gradient(135deg,#00B4FF,#A78BFA)', text: 'Sona joined your crew 🥂',   sub: 'Say hey!',                       story: 'crew'   },
];

const STORIES = {
  round: {
    photo: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=85&auto=format&fit=crop&crop=faces',
    photoPos: 'center 30%',
    emoji: '🥂',
    title: 'Buy a Round',
    sub: 'Real gestures. Real feelings.',
    glow: 'rgba(0,180,255,0.3)',
    accent: 'linear-gradient(135deg,#00B4FF,#00E5A0)',
    accentSolid: '#00B4FF',
    tag: 'GENEROSITY',
    lines: [
      'Send a friend a real drink, coffee, or snack — straight from your phone. It feels like walking up to the bar for them, even when you are miles apart.',
      'No awkward Venmo requests. No IOUs. Just a notification that says someone thought of you and decided to do something about it.',
    ],
  },
  free: {
    photo: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&q=85&auto=format&fit=crop&crop=faces',
    photoPos: 'center 25%',
    emoji: '🟢',
    title: "See Who's Free",
    sub: 'No text needed. Just show up.',
    glow: 'rgba(0,229,160,0.3)',
    accent: 'linear-gradient(135deg,#00E5A0,#0070F3)',
    accentSolid: '#00E5A0',
    tag: 'PRESENCE',
    lines: [
      'Flip your status to Free and your whole crew sees it instantly — no group chat spam, no "anyone around?" into the void.',
      'When two of you are both free at the same time, CLINK nudges you to actually use that window. Those are the best hangs.',
    ],
  },
  watch: {
    photo: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=85&auto=format&fit=crop&crop=center',
    photoPos: 'center 40%',
    emoji: '🎬',
    title: 'Watch Together',
    sub: 'Same couch. Different cities.',
    glow: 'rgba(0,207,213,0.28)',
    accent: 'linear-gradient(135deg,#00CFD5,#00B4FF)',
    accentSolid: '#00CFD5',
    tag: 'SYNC',
    lines: [
      'Pick anything on Netflix, YouTube, or Prime. CLINK counts you both down — 3, 2, 1 — and you press play at the exact same second.',
      'React in real time with live emoji bursts that flood the screen. It actually feels like you are on the same couch.',
    ],
  },
  place: {
    photo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=85&auto=format&fit=crop&crop=center',
    photoPos: 'center 35%',
    emoji: '📍',
    title: 'Find a Spot',
    sub: 'Halfway there, every time.',
    glow: 'rgba(167,139,250,0.3)',
    accent: 'linear-gradient(135deg,#A78BFA,#00B4FF)',
    accentSolid: '#A78BFA',
    tag: 'IRL',
    lines: [
      'Tell CLINK you want to meet up and it finds places that work for both of you — halfway between your locations, matched to the mood.',
      'One tap drops the pin into the hangout so everyone knows exactly where to show up. No more "you pick" loops.',
    ],
  },
  streak: {
    photo: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=85&auto=format&fit=crop&crop=faces',
    photoPos: 'center 25%',
    emoji: '🔥',
    title: 'Friendship Streaks',
    sub: 'Consistency is love.',
    glow: 'rgba(251,191,36,0.3)',
    accent: 'linear-gradient(135deg,#FBBF24,#F59E0B)',
    accentSolid: '#FBBF24',
    tag: 'RITUAL',
    lines: [
      'Every time you and a friend hang out — in person or in CLINK — your streak ticks up. Miss a week and it resets.',
      'Streaks live privately between the two of you. A quiet reminder that the best friendships are built by showing up, again and again.',
    ],
  },
  crew: {
    photo: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=85&auto=format&fit=crop&crop=center',
    photoPos: 'center 30%',
    emoji: '👥',
    title: 'Your Crew',
    sub: 'Close friends only.',
    glow: 'rgba(0,180,255,0.25)',
    accent: 'linear-gradient(135deg,#00B4FF,#A78BFA)',
    accentSolid: '#00B4FF',
    tag: 'BELONGING',
    lines: [
      'Invite the people who actually matter. No followers, no feed, no performance — just your real ones in one private space.',
      'Your crew sees your status, joins your hangouts, and keeps you genuinely close no matter where life scatters you.',
    ],
  },
};

const POLAROIDS = [
  { src: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&q=80&auto=format&fit=crop', label: 'Cheers!',     rot: '-7deg', x: -44, y: 12 },
  { src: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=300&q=80&auto=format&fit=crop', label: 'Movie night', rot:  '4deg', x:   0, y: -8 },
  { src: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=300&q=80&auto=format&fit=crop',    label: 'Always',      rot: '-2deg', x:  44, y: 16 },
];

const AVATARS = [
  'linear-gradient(135deg,#00B4FF,#00CFD5)',
  'linear-gradient(135deg,#00E5A0,#0070F3)',
  'linear-gradient(135deg,#FBBF24,#00E5A0)',
  'linear-gradient(135deg,#A78BFA,#00B4FF)',
  'linear-gradient(135deg,#00B4FF,#FBBF24)',
];

function ClinkLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ position: 'relative', width: 44, height: 28, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#00B4FF,#00CFD5)',
          boxShadow: '0 0 18px rgba(0,180,255,0.75),inset 0 1px 0 rgba(255,255,255,0.25)',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0,
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#00CFD5,#00E5A0)',
          boxShadow: '0 0 18px rgba(0,229,160,0.7),inset 0 1px 0 rgba(255,255,255,0.2)',
          opacity: 0.88,
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: 'rgba(255,255,255,0.22)', filter: 'blur(3px)',
        }} />
      </div>
      <div>
        <div style={{
          fontFamily: '"Outfit","Inter",sans-serif',
          fontWeight: 900, fontSize: '1.55rem', lineHeight: 1, letterSpacing: '0.1em',
          background: 'linear-gradient(90deg,#00B4FF,#00E5A0)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 12px rgba(0,180,255,0.4))',
        }}>CLINK</div>
        <div style={{
          color: 'rgba(255,255,255,0.42)', fontSize: '0.58rem', fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2,
        }}>Hang. Toast. Together.</div>
      </div>
    </div>
  );
}

/* ── Feature story sheet ─────────────────────────────────────── */
function StorySheet({ storyKey, onClose }) {
  const s = STORIES[storyKey];
  if (!s) return null;

  return (
    <>
      {/* Scrim */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(2,12,24,0.75)',
        backdropFilter: 'blur(10px)',
        animation: 'scrimIn 0.22s ease',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        zIndex: 101,
        borderRadius: '28px 28px 0 0',
        overflow: 'hidden',
        animation: 'sheetUp 0.36s cubic-bezier(0.22,1.35,0.58,1)',
        background: '#07111F',
        border: '1px solid rgba(255,255,255,0.07)',
        borderBottom: 'none',
      }}>

        {/* ── Full-bleed photo ── */}
        <div style={{ position: 'relative', height: 260, overflow: 'hidden' }}>
          <img
            src={s.photo}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: s.photoPos,
              display: 'block',
            }}
          />
          {/* cinematic vignette — dark on edges, bright in centre */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg,rgba(7,17,31,0.45) 0%,rgba(7,17,31,0.0) 35%,rgba(7,17,31,0.0) 50%,rgba(7,17,31,0.98) 100%)',
          }} />
          {/* subtle left vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg,rgba(7,17,31,0.4) 0%,transparent 50%)',
          }} />

          {/* Drag pill */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            width: 40, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.3)',
          }} />

          {/* Close */}
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 16,
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(7,17,31,0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>×</button>

          {/* Tag badge */}
          <div style={{
            position: 'absolute', top: 18, left: 18,
            fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.2em',
            color: s.accentSolid, textTransform: 'uppercase',
            background: 'rgba(7,17,31,0.6)',
            border: `1px solid ${s.accentSolid}40`,
            backdropFilter: 'blur(8px)',
            padding: '4px 10px', borderRadius: 20,
          }}>{s.tag}</div>

          {/* Title + sub overlaid on photo bottom */}
          <div style={{
            position: 'absolute', bottom: 20, left: 20, right: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: s.accent, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: `0 0 24px ${s.glow}, 0 0 0 1px rgba(255,255,255,0.1)`,
              }}>{s.emoji}</div>
              <div>
                <h2 style={{
                  fontFamily: '"Outfit","Inter",sans-serif',
                  fontWeight: 900,
                  fontSize: 'clamp(1.5rem,5.5vw,1.85rem)',
                  lineHeight: 1.1, margin: 0,
                  color: '#fff',
                  textShadow: '0 2px 16px rgba(0,0,0,0.6)',
                }}>{s.title}</h2>
                <p style={{
                  fontFamily: '"Inter",sans-serif',
                  fontWeight: 600, fontSize: '0.82rem',
                  color: 'rgba(255,255,255,0.55)',
                  margin: '3px 0 0',
                  textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                }}>{s.sub}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Statements ── */}
        <div style={{
          padding: '22px 22px',
          paddingBottom: 'max(32px,env(safe-area-inset-bottom,32px))',
        }}>
          {/* thin accent rule */}
          <div style={{
            height: 2, borderRadius: 1, marginBottom: 22,
            background: s.accent, opacity: 0.6,
            width: 48,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {s.lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  flexShrink: 0, marginTop: 8,
                  width: 7, height: 7, borderRadius: '50%',
                  background: s.accent,
                  boxShadow: `0 0 8px ${s.glow}`,
                }} />
                <p style={{
                  fontFamily: '"Inter",sans-serif',
                  fontSize: '0.93rem',
                  lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.72)',
                  margin: 0,
                  fontWeight: 400,
                }}>{line}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scrimIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes sheetUp   { from { transform:translateX(-50%) translateY(110%) } to { transform:translateX(-50%) translateY(0) } }
        @keyframes orbFloat  { 0%,100% { transform:translateY(0px) } 50% { transform:translateY(-18px) } }
        @keyframes ticker    { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        @keyframes ringPulse { 0%,100% { opacity:0.55; transform:scale(1) } 50% { opacity:0.15; transform:scale(1.35) } }
        @keyframes livePulse { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.4; transform:scale(0.85) } }
        @keyframes btnShimmer{ 0% { transform:translateX(-120%) } 60%,100% { transform:translateX(280%) } }
      `}</style>
    </>
  );
}

export default function Welcome() {
  const nav = useNavigate();
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused,  setPaused]  = useState(false);
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % NOTIFS.length); setVisible(true); }, 350);
    }, 2600);
    return () => clearInterval(t);
  }, [paused]);

  const n = NOTIFS[idx];

  const handleNotifClick = () => { setPaused(true); setOpenKey(n.story); };
  const handleClose      = () => { setOpenKey(null); setPaused(false);   };

  return (
    <>
      <div style={{
        width: '100%', height: '100dvh', background: '#020C18',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
        maxWidth: 480, margin: '0 auto',
      }}>

        {/* ═══ TOP — photo hero 60% ═════════════════════════════ */}
        <div style={{ position: 'relative', flex: '0 0 60%', overflow: 'hidden' }}>
          <img
            src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=900&q=80&auto=format&fit=crop&crop=center"
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 42%',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg,rgba(2,12,24,0.88) 0%,rgba(2,12,24,0) 32%,rgba(2,12,24,0) 55%,rgba(2,12,24,0.97) 100%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg,transparent,#00B4FF 30%,#00E5A0 70%,transparent)',
            opacity: 0.75,
          }} />

          {/* Logo — top left */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            paddingTop: 'max(20px,env(safe-area-inset-top,20px))',
            paddingLeft: 20, zIndex: 30,
          }}>
            <ClinkLogo />
          </div>

          {/* Polaroids */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            paddingTop: '18%', zIndex: 10,
          }}>
            <div style={{ position: 'relative', width: 240, height: 160 }}>
              {POLAROIDS.map((p, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 104, height: 130,
                  top: '50%', left: '50%',
                  transform: `translate(calc(-50% + ${p.x}px),calc(-50% + ${p.y}px)) rotate(${p.rot})`,
                  zIndex: i + 1, background: '#fff',
                  padding: 5, paddingBottom: 26, borderRadius: 8,
                  boxShadow: '0 10px 32px rgba(0,0,0,0.65),0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  <img src={p.src} alt="" style={{
                    width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, display: 'block',
                  }} />
                  <p style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    textAlign: 'center', color: '#222', fontWeight: 800,
                    fontSize: '0.56rem', paddingBottom: 5, margin: 0,
                  }}>{p.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notification bubble — always left, clickable */}
          <div style={{
            position: 'absolute', bottom: 14, left: 20,
            zIndex: 20,
          }}>
            <button
              onClick={handleNotifClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px 10px 12px',
                borderRadius: 18, maxWidth: 280,
                background: 'rgba(2,12,24,0.82)',
                border: '1px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                cursor: 'pointer', textAlign: 'left',
                opacity:   visible ? 1 : 0,
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)',
                transition: 'opacity 0.35s ease,transform 0.35s ease',
              }}>
              <div style={{
                width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                background: n.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, color: '#fff', fontSize: '0.62rem',
                fontFamily: '"Outfit","Inter",sans-serif',
              }}>{n.avatar}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.3, margin: 0 }}>{n.text}</p>
                <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.67rem', margin: '2px 0 0' }}>{n.sub}</p>
              </div>
              <div style={{
                fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
                paddingLeft: 6,
              }}>tap</div>
            </button>
          </div>
        </div>

        {/* ═══ BOTTOM — live, animated CTA section ════════════ */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '18px 24px',
          paddingBottom: 'max(24px,env(safe-area-inset-bottom,24px))',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Animated background orbs */}
          <div style={{
            position: 'absolute', top: -40, right: -30,
            width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(0,180,255,0.18) 0%,transparent 70%)',
            animation: 'orbFloat 6s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: 20, left: -40,
            width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(0,229,160,0.15) 0%,transparent 70%)',
            animation: 'orbFloat 8s ease-in-out infinite reverse',
            pointerEvents: 'none',
          }} />

          {/* Headline */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontFamily: '"Outfit","Inter",sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(1.6rem,5.5vw,1.95rem)',
              color: '#fff', lineHeight: 1.2, margin: 0,
            }}>
              Your crew never<br />
              <span style={{
                background: 'linear-gradient(90deg,#00B4FF,#00E5A0)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>feels far away.</span>
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.38)', fontSize: '0.82rem',
              marginTop: 8, lineHeight: 1.55, fontFamily: '"Inter",sans-serif',
            }}>
              Watch together. Eat together. Send a round. Stay close.
            </p>
          </div>

          {/* Live activity ticker */}
          <div style={{
            position: 'relative', zIndex: 1,
            overflow: 'hidden', height: 22,
          }}>
            <div style={{ display: 'flex', gap: 32, animation: 'ticker 22s linear infinite', whiteSpace: 'nowrap' }}>
              {[
                '🥂 Ravi sent a round to Karan',
                '🟢 Sofia is free right now',
                '🎬 Priya started a movie night',
                '🔥 14-day streak with Alex',
                '📍 Meeting at Zaza Bistro',
                '👥 New crew: The Bombay Gang',
                '🥂 Ravi sent a round to Karan',
                '🟢 Sofia is free right now',
                '🎬 Priya started a movie night',
                '🔥 14-day streak with Alex',
              ].map((item, i) => (
                <span key={i} style={{
                  fontSize: '0.72rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.35)',
                  fontFamily: '"Inter",sans-serif',
                  flexShrink: 0,
                }}>{item}</span>
              ))}
            </div>
          </div>

          {/* Social proof — online avatars with pulse rings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex' }}>
              {AVATARS.map((g, i) => (
                <div key={i} style={{
                  position: 'relative',
                  marginLeft: i > 0 ? -8 : 0,
                  zIndex: 10 - i,
                }}>
                  {/* Pulsing online ring */}
                  <div style={{
                    position: 'absolute', inset: -3,
                    borderRadius: '50%',
                    border: '2px solid rgba(0,229,160,0.6)',
                    animation: `ringPulse ${1.8 + i * 0.4}s ease-in-out infinite`,
                  }} />
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: g, border: '2px solid #020C18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, color: '#fff', fontSize: '0.6rem',
                    position: 'relative',
                  }}>{['R','A','S','K','M'][i]}</div>
                  {/* green dot */}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#00E5A0', border: '1.5px solid #020C18',
                    boxShadow: '0 0 6px rgba(0,229,160,0.8)',
                  }} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#00E5A0',
                  boxShadow: '0 0 8px rgba(0,229,160,0.9)',
                  animation: 'livePulse 1.4s ease-in-out infinite',
                }} />
                <p style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>247 crews online right now</p>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.68rem', margin: '2px 0 0' }}>hanging out across the world</p>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>
            <button
              onClick={() => nav('/auth?mode=signup')}
              style={{
                width: '100%', padding: '16px 0',
                background: 'linear-gradient(135deg,#00B4FF,#00E5A0)',
                border: 'none', borderRadius: 18,
                color: '#020C18', fontFamily: '"Outfit","Inter",sans-serif',
                fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 0 32px rgba(0,180,255,0.4),0 4px 20px rgba(0,229,160,0.25)',
                position: 'relative', overflow: 'hidden',
              }}>
              {/* Shimmer sweep */}
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: '60%',
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)',
                animation: 'btnShimmer 2.8s ease-in-out infinite',
              }} />
              <span style={{ position: 'relative', zIndex: 1 }}>Get Started — Free Forever</span>
            </button>
            <button
              onClick={() => nav('/auth?mode=login')}
              style={{
                width: '100%', padding: '13px 0',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 18, color: 'rgba(255,255,255,0.55)',
                fontFamily: '"Inter",sans-serif',
                fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              }}>
              I already have an account
            </button>
          </div>
        </div>
      </div>

      {openKey && <StorySheet storyKey={openKey} onClose={handleClose} />}
    </>
  );
}
