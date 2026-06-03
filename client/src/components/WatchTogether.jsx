import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Film } from 'lucide-react';

// ── Source detection ───────────────────────────────────────────
function detectSource(url) {
  const u = url.toLowerCase();
  if (/youtu\.be|youtube\.com/.test(u))  return 'youtube';
  if (/vimeo\.com/.test(u))              return 'vimeo';
  return 'direct'; // treat everything else as a raw video URL
}

function extractYouTubeId(url) {
  const patterns = [
    /youtu\.be\/([^?&#\s]+)/,
    /[?&]v=([^&#\s]+)/,
    /youtube\.com\/embed\/([^?&#\s]+)/,
    /youtube\.com\/shorts\/([^?&#\s]+)/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function extractVimeoId(url) {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

// ── SDK loaders (run once, cache callbacks) ────────────────────
let ytReady = false, ytCallbacks = [];
function loadYT(cb) {
  if (window.YT?.Player) { cb(); return; }
  ytCallbacks.push(cb);
  if (!ytReady) {
    ytReady = true;
    window.onYouTubeIframeAPIReady = () => { ytCallbacks.forEach(fn => fn()); ytCallbacks = []; };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
}

let vimeoReady = false, vimeoCallbacks = [];
function loadVimeo(cb) {
  if (window.Vimeo?.Player) { cb(); return; }
  vimeoCallbacks.push(cb);
  if (!vimeoReady) {
    vimeoReady = true;
    const s = document.createElement('script'); s.src = 'https://player.vimeo.com/api/player.js';
    s.onload = () => { vimeoCallbacks.forEach(fn => fn()); vimeoCallbacks = []; };
    document.head.appendChild(s);
  }
}

// ── Unified player factories ───────────────────────────────────
// Each returns Promise<{ play, pause, seekTo, getCurrentTime, destroy }>

function initYouTube(container, videoId, { onPlay, onPause }) {
  return new Promise(resolve => {
    loadYT(() => {
      const yt = new window.YT.Player(container, {
        videoId,
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, playsinline: 1, fs: 0 },
        events: {
          onStateChange: (e) => {
            const t = yt.getCurrentTime?.() || 0;
            if (e.data === 1) onPlay(t);
            else if (e.data === 2) onPause(t);
          },
        },
      });
      resolve({
        play:           ()  => yt.playVideo(),
        pause:          ()  => yt.pauseVideo(),
        seekTo:         (t) => yt.seekTo(t, true),
        getCurrentTime: ()  => yt.getCurrentTime?.() || 0,
        destroy:        ()  => { try { yt.destroy(); } catch {} },
      });
    });
  });
}

function initVimeo(container, videoId, { onPlay, onPause }) {
  return new Promise(resolve => {
    loadVimeo(async () => {
      const vp = new window.Vimeo.Player(container, {
        id:          videoId,
        controls:    false,
        playsinline: true,
        responsive:  true,
      });
      vp.on('play',  async () => { const t = await vp.getCurrentTime(); onPlay(t);  });
      vp.on('pause', async () => { const t = await vp.getCurrentTime(); onPause(t); });
      resolve({
        play:           ()  => vp.play(),
        pause:          ()  => vp.pause(),
        seekTo:         (t) => vp.setCurrentTime(t),
        getCurrentTime: ()  => vp.getCurrentTime(), // returns Promise
        destroy:        ()  => vp.destroy(),
      });
    });
  });
}

function initDirect(container, url, { onPlay, onPause }) {
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.src           = url;
    v.playsInline   = true;
    v.controls      = false;
    v.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;display:block';
    container.innerHTML = '';
    container.appendChild(v);
    v.addEventListener('play',  () => onPlay(v.currentTime));
    v.addEventListener('pause', () => onPause(v.currentTime));
    resolve({
      play:           ()  => v.play().catch(() => {}),
      pause:          ()  => v.pause(),
      seekTo:         (t) => { v.currentTime = t; },
      getCurrentTime: ()  => v.currentTime,
      destroy:        ()  => { v.pause(); v.src = ''; container.innerHTML = ''; },
    });
  });
}

// ── Source metadata for the UI ─────────────────────────────────
const SOURCES = {
  youtube: { label: 'YouTube',    color: '#FF0000', hint: 'youtube.com/...  ·  youtu.be/...' },
  vimeo:   { label: 'Vimeo',      color: '#1AB7EA', hint: 'vimeo.com/...' },
  direct:  { label: 'Video file', color: '#A78BFA', hint: 'any .mp4 / .webm / Google Drive / Dropbox link' },
};

// ── Main component ─────────────────────────────────────────────
export default function WatchTogether({ hangoutId, socket, remoteVideo, remoteControl }) {
  const [urlInput,  setUrlInput]  = useState('');
  const [videoId,   setVideoId]   = useState(null);
  const [source,    setSource]    = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error,     setError]     = useState('');

  const playerRef   = useRef(null);
  const divRef      = useRef(null);
  const suppressRef = useRef(false);

  // ── Init / reinit player when videoId or source changes ───────
  useEffect(() => {
    if (!videoId || !source) return;
    let cancelled = false;

    const suppress = (fn) => { suppressRef.current = true; fn(); setTimeout(() => { suppressRef.current = false; }, 500); };

    const onPlay  = (t) => { if (suppressRef.current) return; setIsPlaying(true);  socket?.emit('watch-control', { hangoutId, action: 'play',  t }); };
    const onPause = (t) => { if (suppressRef.current) return; setIsPlaying(false); socket?.emit('watch-control', { hangoutId, action: 'pause', t }); };

    (async () => {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      if (divRef.current) divRef.current.innerHTML = '';

      let p;
      if      (source === 'youtube') p = await initYouTube(divRef.current, videoId, { onPlay, onPause });
      else if (source === 'vimeo')   p = await initVimeo  (divRef.current, videoId, { onPlay, onPause });
      else                           p = await initDirect  (divRef.current, videoId, { onPlay, onPause });

      if (!cancelled) playerRef.current = p;
      else            p.destroy();
    })();

    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [videoId, source]);

  // ── Apply remote video (partner started something) ─────────────
  useEffect(() => {
    if (!remoteVideo) return;
    if (remoteVideo.videoId !== videoId || remoteVideo.source !== source) {
      setVideoId(remoteVideo.videoId);
      setSource(remoteVideo.source);
    }
  }, [remoteVideo]);

  // ── Apply remote control (play / pause / seek) ─────────────────
  useEffect(() => {
    if (!remoteControl || !playerRef.current) return;
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, 500);
    const p = playerRef.current;
    const { action, t } = remoteControl;
    if (action === 'play')  { p.seekTo(t); p.play();  setIsPlaying(true);  }
    if (action === 'pause') { p.seekTo(t); p.pause(); setIsPlaying(false); }
    if (action === 'seek')  { p.seekTo(t); }
  }, [remoteControl]);

  // ── User submits a URL ─────────────────────────────────────────
  const handleLoad = () => {
    const url = urlInput.trim();
    if (!url) { setError('Paste a video link to get started'); return; }

    const src = detectSource(url);
    let vid = url;

    if (src === 'youtube') {
      vid = extractYouTubeId(url);
      if (!vid) { setError("Couldn't read that YouTube link — try copying it from the browser address bar"); return; }
    }
    if (src === 'vimeo') {
      vid = extractVimeoId(url);
      if (!vid) { setError("Couldn't read that Vimeo link"); return; }
    }

    setError('');
    setVideoId(vid);
    setSource(src);
    socket?.emit('watch-start', { hangoutId, videoId: vid, source: src });
  };

  // ── Playback controls ──────────────────────────────────────────
  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pause(); else p.play();
  };

  const restart = () => {
    const p = playerRef.current;
    if (!p) return;
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, 500);
    p.seekTo(0); p.play(); setIsPlaying(true);
    socket?.emit('watch-control', { hangoutId, action: 'play', t: 0 });
  };

  const changeVideo = () => { setVideoId(null); setSource(null); setUrlInput(''); setIsPlaying(false); };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="px-5 pb-6 flex flex-col gap-4">

      {!videoId ? (
        <>
          {/* Source tiles */}
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(SOURCES).map(([key, s]) => (
              <div key={key} className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="font-bold text-xs mb-0.5" style={{ color: s.color }}>{s.label}</p>
                <p className="text-gray-700" style={{ fontSize: '0.6rem', lineHeight: 1.4 }}>{s.hint}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="Paste any video link…"
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLoad()}
              autoFocus
            />
            <button
              className="font-bold rounded-2xl px-5 text-sm flex-shrink-0 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#F472B6)', color: '#fff', minHeight: 58 }}
              onClick={handleLoad}>
              Watch
            </button>
          </div>

          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
        </>
      ) : (
        <>
          {/* Source badge */}
          {source && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{ background: `${SOURCES[source].color}20`, color: SOURCES[source].color, border: `1px solid ${SOURCES[source].color}40` }}>
                {SOURCES[source].label}
              </span>
              <span className="text-gray-600 text-xs">synced in real time ✨</span>
            </div>
          )}

          {/* 16:9 player container */}
          <div className="rounded-2xl overflow-hidden w-full"
            style={{ aspectRatio: '16/9', background: '#000' }}>
            <div ref={divRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button onClick={togglePlay}
              className="flex-1 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#F472B6)', color: '#fff', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
              {isPlaying ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Play</>}
            </button>
            <button onClick={restart} title="Restart from beginning"
              className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
              <RotateCcw size={16} />
            </button>
            <button onClick={changeVideo} title="Change video"
              className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
              <Film size={16} />
            </button>
          </div>

          <p className="text-gray-700 text-xs text-center">Both of you see the same frame in real time</p>
        </>
      )}
    </div>
  );
}
