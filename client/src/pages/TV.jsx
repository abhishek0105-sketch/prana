import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, Smartphone, Tv, SkipBack } from 'lucide-react';
import useTVMode from '../hooks/useTVMode';

// ── StreamingCard defined at module level (not inside render) ──
// Avoids React treating it as a new component type on every re-render.
function StreamingCard({ svc }) {
  return (
    <a href={svc.url} target="_blank" rel="noopener noreferrer"
      className="tv-card focus:outline-none flex flex-col items-center justify-center gap-3 rounded-3xl py-8 px-6 transition-all"
      style={{ background: `${svc.color}14`, border: `2px solid ${svc.color}30`, textDecoration: 'none' }}
      tabIndex={0}>
      <span className="font-black text-2xl" style={{ color: svc.color }}>{svc.name}</span>
      <span className="text-sm opacity-60 text-center">{svc.hint}</span>
    </a>
  );
}

const SERVICES = [
  { name: 'Netflix',     color: '#E50914', url: 'https://netflix.com',    hint: 'Open on Netflix' },
  { name: 'Prime Video', color: '#00A8E1', url: 'https://primevideo.com', hint: 'Open on Prime Video' },
  { name: 'Disney+',     color: '#113CCF', url: 'https://disneyplus.com', hint: 'Open on Disney+' },
  { name: 'Max',         color: '#002BE7', url: 'https://max.com',        hint: 'Open on Max' },
  { name: 'Hulu',        color: '#1CE783', url: 'https://hulu.com',       hint: 'Open on Hulu' },
  { name: 'Apple TV+',   color: '#A3AAAE', url: 'https://tv.apple.com',   hint: 'Open on Apple TV+' },
];

// ── Tiny player factories (self-contained — no auth needed) ──
let _ytReady = false, _ytCbs = [];
function loadYT(cb) {
  if (window.YT?.Player) { cb(); return; }
  _ytCbs.push(cb);
  if (!_ytReady) {
    _ytReady = true;
    window.onYouTubeIframeAPIReady = () => { _ytCbs.forEach(f => f()); _ytCbs = []; };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
}

function initYT(container, videoId, { onPlay, onPause }) {
  return new Promise(resolve => {
    loadYT(() => {
      const p = new window.YT.Player(container, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, playsinline: 1, fs: 1 },
        events: {
          onStateChange: (e) => {
            const t = p.getCurrentTime?.() || 0;
            if (e.data === 1) onPlay(t);
            else if (e.data === 2) onPause(t);
          },
        },
      });
      resolve({
        play: () => p.playVideo(),
        pause: () => p.pauseVideo(),
        seekTo: (t) => p.seekTo(t, true),
        getCurrentTime: () => p.getCurrentTime?.() || 0,
        destroy: () => { try { p.destroy(); } catch {} },
      });
    });
  });
}

function initDirect(container, url, { onPlay, onPause }) {
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.src = url; v.playsInline = true; v.controls = false; v.autoplay = true;
    v.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;background:#000';
    container.innerHTML = '';
    container.appendChild(v);
    v.addEventListener('play',  () => onPlay(v.currentTime));
    v.addEventListener('pause', () => onPause(v.currentTime));
    resolve({
      play: () => v.play().catch(() => {}),
      pause: () => v.pause(),
      seekTo: (t) => { v.currentTime = t; },
      getCurrentTime: () => v.currentTime,
      destroy: () => { v.pause(); v.src = ''; container.innerHTML = ''; },
    });
  });
}

// ── Main TV page ───────────────────────────────────────────────
export default function TV() {
  // force=true: always activate TV mode on this page regardless of UA detection.
  // useTVMode already calls useSpatialNav internally — no separate call needed.
  useTVMode(true);

  const [videoId,   setVideoId]   = useState(null);
  const [source,    setSource]    = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQr,    setShowQr]    = useState(true);

  const playerRef         = useRef(null);
  const divRef            = useRef(null);
  const supRef            = useRef(false);
  const pendingControlRef = useRef(null); // queued control while player initialises
  // Refs for polling — avoid stale closures without recreating the interval
  const videoIdRef  = useRef(null);
  const sourceRef   = useRef(null);
  const lastSeqRef  = useRef(0);
  const videoSeqRef = useRef(0); // tracks last-seen videoSeq cleanly (no ._seq hack)

  // Keep refs in sync with state
  useEffect(() => { videoIdRef.current  = videoId; },  [videoId]);
  useEffect(() => { sourceRef.current   = source;  },  [source]);

  // Stable session code
  const tvCode = useMemo(() => {
    let c = sessionStorage.getItem('clink-tv-code');
    if (!c) {
      c = Math.random().toString(36).substring(2, 8).toUpperCase();
      sessionStorage.setItem('clink-tv-code', c);
    }
    return c;
  }, []);

  const controlUrl = `${window.location.origin}/tv-control?code=${tvCode}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(controlUrl)}&bgcolor=020C18&color=00B4FF&format=svg&margin=10`;

  // ── Apply a control command ────────────────────────────────────
  // If the player isn't ready yet, queue the command for after init.
  const applyControl = useCallback(({ action, t }) => {
    const p = playerRef.current;
    if (!p) {
      pendingControlRef.current = { action, t }; // will be flushed after init
      return;
    }
    supRef.current = true;
    setTimeout(() => { supRef.current = false; }, 600);
    if (action === 'play')  { p.seekTo(t); p.play();  setIsPlaying(true);  }
    if (action === 'pause') { p.seekTo(t); p.pause(); setIsPlaying(false); }
    if (action === 'seek')  { p.seekTo(t); }
  }, []); // stable — reads only refs and setters

  // ── Poll server every 3 s ─────────────────────────────────────
  // Depends only on tvCode — never recreated when video/control state changes.
  // Uses refs for current videoId/source/lastSeq to avoid stale closures.
  useEffect(() => {
    const API = `${import.meta.env.VITE_API_URL || ''}/api/tv/${tvCode}`;

    const poll = async () => {
      try {
        const res  = await fetch(API);
        if (!res.ok) return;
        const data = await res.json();

        // New video (or re-send of the same video uses videoSeq to detect)
        if (
          data.videoId &&
          (data.videoId !== videoIdRef.current ||
           data.source  !== sourceRef.current  ||
           (data.videoSeq || 0) > videoSeqRef.current)
        ) {
          videoSeqRef.current = data.videoSeq || 0;
          setVideoId(data.videoId);
          setSource(data.source);
          setShowQr(false);
        }

        // New control command
        if (data.seq > lastSeqRef.current && data.control) {
          lastSeqRef.current = data.seq;
          applyControl(data.control);
        }
      } catch { /* network hiccup — retry next tick */ }
    };

    poll();
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [tvCode, applyControl]);

  // ── Init / reinit player ───────────────────────────────────────
  useEffect(() => {
    if (!videoId || !source || source === 'external') return;
    let cancelled = false;

    const onPlay  = () => { if (!supRef.current) setIsPlaying(true);  };
    const onPause = () => { if (!supRef.current) setIsPlaying(false); };

    (async () => {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      if (divRef.current) divRef.current.innerHTML = '';

      let p;
      if (source === 'youtube') p = await initYT(divRef.current, videoId, { onPlay, onPause });
      else                      p = await initDirect(divRef.current, videoId, { onPlay, onPause });

      if (cancelled) { p.destroy(); return; }

      playerRef.current = p;
      setIsPlaying(true); // auto-plays

      // Flush any control command that arrived while player was initialising
      if (pendingControlRef.current) {
        applyControl(pendingControlRef.current);
        pendingControlRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [videoId, source, applyControl]);

  // ── Local controls ─────────────────────────────────────────────
  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) { p.pause(); setIsPlaying(false); }
    else           { p.play();  setIsPlaying(true);  }
  };

  const restart = () => {
    const p = playerRef.current;
    if (!p) return;
    supRef.current = true;
    setTimeout(() => { supRef.current = false; }, 600);
    p.seekTo(0); p.play(); setIsPlaying(true);
  };

  const stopVideo = () => {
    try { playerRef.current?.destroy(); } catch {}
    playerRef.current = null;
    if (divRef.current) divRef.current.innerHTML = '';
    setVideoId(null); setSource(null); setIsPlaying(false); setShowQr(true);
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="tv-page h-screen flex flex-col overflow-hidden"
      style={{ background: '#08080f', color: '#fff' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-12 py-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Tv size={32} style={{ color: '#00B4FF' }} />
          <span className="font-black text-3xl grad-text">CLINK</span>
          <span className="text-gray-600 text-xl font-medium">TV</span>
        </div>
        {videoId && (
          <button onClick={stopVideo} tabIndex={0}
            className="tv-btn-sm focus:outline-none rounded-2xl px-6 py-3 text-lg font-semibold transition-all"
            style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
            ✕ Exit
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col px-12 pb-10 gap-8">

        {/* ── VIDEO PLAYER ── */}
        {videoId && source !== 'external' && (
          <>
            <div className="flex-1 min-h-0 rounded-3xl overflow-hidden"
              style={{ background: '#000', border: '2px solid rgba(255,255,255,0.06)' }}>
              <div ref={divRef} style={{ width: '100%', height: '100%' }} />
            </div>

            <div className="flex items-center justify-center gap-6 flex-shrink-0">
              <button onClick={restart} tabIndex={0}
                className="tv-btn focus:outline-none flex items-center justify-center gap-3 rounded-2xl transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.1)', color: '#9CA3AF' }}>
                <SkipBack size={28} />
              </button>

              <button onClick={togglePlay} tabIndex={0} data-tv-playpause
                className="tv-btn-lg focus:outline-none flex items-center justify-center gap-4 rounded-2xl font-black transition-all"
                style={{ background: 'linear-gradient(135deg,#00B4FF,#00E5A0)', color: '#020C18', boxShadow: '0 0 40px rgba(0,180,255,0.5)' }}>
                {isPlaying ? <><Pause size={36} /> Pause</> : <><Play size={36} /> Play</>}
              </button>

              <button onClick={() => setShowQr(q => !q)} tabIndex={0}
                className="tv-btn focus:outline-none flex items-center justify-center gap-3 rounded-2xl transition-all"
                style={{ background: 'rgba(0,180,255,0.1)', border: '2px solid rgba(0,180,255,0.3)', color: '#00E5A0' }}>
                <Smartphone size={28} />
              </button>
            </div>
          </>
        )}

        {/* ── STREAMING SYNC MODE ── */}
        {videoId && source === 'external' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <p className="text-5xl font-black">🎬 Ready to sync</p>
            <p className="text-gray-400 text-2xl text-center max-w-3xl">
              Open the same title on your streaming service, then use your phone remote to start the countdown
            </p>
            <button onClick={stopVideo} tabIndex={0}
              className="tv-btn focus:outline-none rounded-2xl font-semibold"
              style={{ background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.1)', color: '#9CA3AF' }}>
              ← Back
            </button>
          </div>
        )}

        {/* ── IDLE / NO VIDEO ── */}
        {!videoId && (
          <div className="flex-1 flex gap-12 overflow-hidden">
            {/* Left: QR + code */}
            <div className="flex flex-col items-center justify-center gap-6 flex-shrink-0" style={{ width: 340 }}>
              <div className="rounded-3xl overflow-hidden"
                style={{ border: '3px solid rgba(0,180,255,0.4)', background: '#020C18', padding: 8 }}>
                <img src={qrSrc} alt="Phone control QR code" width={220} height={220} style={{ display: 'block' }}
  onError={e => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-xl mb-1">Scan with your phone</p>
                <p className="text-gray-500 text-base">to control this TV</p>
                <p className="font-mono font-black text-3xl mt-3"
                  style={{ color: '#00B4FF', letterSpacing: '0.25em' }}>{tvCode}</p>
                <p className="text-gray-600 text-sm mt-1">
                  or go to <span style={{ color: '#00E5A0' }}>{window.location.host}/tv-control</span>
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center gap-3">
              <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.07)' }} />
              <p className="text-gray-600 font-semibold text-lg px-2">or</p>
              <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Right: streaming tiles */}
            <div className="flex-1 flex flex-col gap-4 overflow-auto">
              <p className="text-gray-500 text-xl font-semibold flex-shrink-0">Open a streaming service</p>
              <div className="grid grid-cols-3 gap-4">
                {SERVICES.map(svc => <StreamingCard key={svc.name} svc={svc} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Phone-control QR overlay during playback */}
      {videoId && showQr && source !== 'external' && (
        <div className="absolute bottom-28 right-12 flex items-end gap-6 pop-in">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '2px solid rgba(0,180,255,0.5)', padding: 6, background: '#020C18' }}>
              <img src={qrSrc} alt="QR code" width={140} height={140} style={{ display: 'block' }} />
            </div>
            <p className="text-xs text-gray-500 text-center">Scan to control</p>
            <p className="font-mono font-black text-xl"
              style={{ color: '#00B4FF', letterSpacing: '0.2em' }}>{tvCode}</p>
          </div>
        </div>
      )}
    </div>
  );
}
