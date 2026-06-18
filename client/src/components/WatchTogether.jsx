import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Film, FolderOpen, ExternalLink, RefreshCw, Monitor, MonitorOff } from 'lucide-react';

// ── Source detection ───────────────────────────────────────────
function detectSource(url) {
  const u = url.toLowerCase();
  if (/youtu\.be|youtube\.com/.test(u))       return 'youtube';
  if (/vimeo\.com/.test(u))                   return 'vimeo';
  if (/netflix\.com/.test(u))                 return 'external';
  if (/amazon\.com|primevideo\.com/.test(u))  return 'external';
  if (/disneyplus\.com/.test(u))              return 'external';
  if (/max\.com|hbomax\.com/.test(u))         return 'external';
  if (/hulu\.com/.test(u))                    return 'external';
  if (/peacocktv\.com/.test(u))               return 'external';
  if (/paramountplus\.com/.test(u))           return 'external';
  if (/crunchyroll\.com/.test(u))             return 'external';
  if (/apple\.com\/tv/.test(u))               return 'external';
  if (/mubi\.com/.test(u))                    return 'external';
  return 'direct';
}

// Returns display info for the specific streaming service
function getServiceInfo(url) {
  const u = (url || '').toLowerCase();
  if (/netflix/.test(u))           return { name: 'Netflix',        color: '#E50914' };
  if (/amazon|primevideo/.test(u)) return { name: 'Prime Video',    color: '#00A8E1' };
  if (/disneyplus/.test(u))        return { name: 'Disney+',        color: '#113CCF' };
  if (/max\.com|hbomax/.test(u))   return { name: 'Max',            color: '#002BE7' };
  if (/hulu/.test(u))              return { name: 'Hulu',           color: '#1CE783' };
  if (/peacock/.test(u))           return { name: 'Peacock',        color: '#F5A623' };
  if (/paramount/.test(u))         return { name: 'Paramount+',     color: '#0064FF' };
  if (/crunchyroll/.test(u))       return { name: 'Crunchyroll',    color: '#F47521' };
  if (/apple/.test(u))             return { name: 'Apple TV+',      color: '#A3AAAE' };
  if (/mubi/.test(u))              return { name: 'MUBI',           color: '#FF0000' };
  return                                  { name: 'Streaming',       color: '#00B4FF' };
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
  // Handles: vimeo.com/ID, vimeo.com/video/ID, vimeo.com/channels/name/ID, vimeo.com/groups/name/ID
  const m = url.match(/vimeo\.com\/(?:[^\/]+\/)*(\d+)/);
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
        id: videoId, controls: false, playsinline: true, responsive: true,
      });
      vp.on('play',  async () => { const t = await vp.getCurrentTime(); onPlay(t);  });
      vp.on('pause', async () => { const t = await vp.getCurrentTime(); onPause(t); });
      resolve({
        play:           ()  => vp.play(),
        pause:          ()  => vp.pause(),
        seekTo:         (t) => vp.setCurrentTime(t),
        getCurrentTime: ()  => vp.getCurrentTime(),
        destroy:        ()  => vp.destroy(),
      });
    });
  });
}

function initDirect(container, url, { onPlay, onPause }) {
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.src = url; v.playsInline = true; v.controls = false;
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

// objectUrl is created from a File — no upload, no server, lives only in this tab
function initLocalFile(container, objectUrl, { onPlay, onPause }) {
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.src = objectUrl; v.playsInline = true; v.controls = false;
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
      destroy:        ()  => { v.pause(); v.src = ''; URL.revokeObjectURL(objectUrl); container.innerHTML = ''; },
    });
  });
}

// ── Source metadata for the UI ─────────────────────────────────
const SOURCES = {
  youtube:  { label: 'YouTube',    color: '#FF0000', hint: 'youtube.com · youtu.be' },
  vimeo:    { label: 'Vimeo',      color: '#1AB7EA', hint: 'vimeo.com' },
  direct:   { label: 'Video URL',  color: '#00E5A0', hint: '.mp4 / .webm / Drive / Dropbox' },
  local:    { label: 'Your file',  color: '#10B981', hint: 'movie from your computer' },
  external: { label: 'Streaming',  color: '#E50914', hint: 'Netflix · Prime · Disney+ · Max · Hulu · more' },
};

// ── Countdown display ──────────────────────────────────────────
function CountdownBubble({ value }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-1">
      <div className="font-black text-7xl leading-none transition-all"
        style={{ color: value === 0 ? '#10B981' : '#fff', transform: value === 0 ? 'scale(1.15)' : 'scale(1)' }}>
        {value === 0 ? '▶' : value}
      </div>
      <p className="text-xs font-semibold" style={{ color: value === 0 ? '#10B981' : '#9CA3AF' }}>
        {value === 0 ? 'Press play!' : 'Get ready…'}
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function WatchTogether({
  hangoutId, socket, remoteVideo, remoteControl,
  // Screen share
  isScreenSharing, localScreenStream, remoteScreenStream,
  onStartScreenShare, onStopScreenShare,
}) {
  const [urlInput,       setUrlInput]       = useState('');
  const [videoId,        setVideoId]        = useState(null);
  const [source,         setSource]         = useState(null);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [error,          setError]          = useState('');
  const [localFileReady, setLocalFileReady] = useState(false);

  // Streaming-sync state
  const [syncReady,       setSyncReady]       = useState(false);   // I clicked "I'm ready"
  const [partnerReady,    setPartnerReady]    = useState(false);   // partner clicked ready
  const [countdown,       setCountdown]       = useState(null);    // null | 3 | 2 | 1 | 0
  const [watchingSince,   setWatchingSince]   = useState(null);    // Date.now() when Play! fired
  const [elapsed,         setElapsed]         = useState(0);       // seconds since play

  const playerRef         = useRef(null);
  const divRef            = useRef(null);
  const suppressRef       = useRef(false);
  const fileInputRef      = useRef(null);
  const localObjectUrlRef = useRef(null);
  const countdownRef       = useRef(null);
  const elapsedRef         = useRef(null);
  const screenPreviewRef   = useRef(null); // local screen share mini-preview
  const remoteScreenRef    = useRef(null); // remote screen stream (full view)

  // ── Listen for partner ready state via socket ──────────────────
  useEffect(() => {
    if (!socket) return;
    const onReady = ({ ready }) => setPartnerReady(ready);
    socket.on('watch-ready', onReady);
    return () => socket.off('watch-ready', onReady);
  }, [socket]);

  // ── Auto-start countdown when both are ready ───────────────────
  useEffect(() => {
    if (!syncReady || !partnerReady || countdown !== null) return;
    let n = 3;
    setCountdown(n);
    countdownRef.current = setInterval(() => {
      n--;
      if (n < 0) {
        // Clear first so we never render a negative value
        clearInterval(countdownRef.current);
        setCountdown(null);
        setWatchingSince(Date.now());
      } else {
        setCountdown(n);
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [syncReady, partnerReady]);

  // ── Elapsed watch timer ────────────────────────────────────────
  useEffect(() => {
    if (!watchingSince) return;
    elapsedRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - watchingSince) / 1000));
    }, 1000);
    return () => clearInterval(elapsedRef.current);
  }, [watchingSince]);

  // ── Attach screen streams to video elements ────────────────────
  useEffect(() => {
    if (screenPreviewRef.current && localScreenStream) {
      screenPreviewRef.current.srcObject = localScreenStream;
    }
  }, [localScreenStream]);

  useEffect(() => {
    if (remoteScreenRef.current) {
      remoteScreenRef.current.srcObject = remoteScreenStream || null;
    }
  }, [remoteScreenStream]);

  // ── Init / reinit player when videoId or source changes ───────
  useEffect(() => {
    if (!videoId || !source) return;
    if (source === 'external') return; // no embedded player for streaming services
    if (source === 'local' && !localFileReady) return;
    let cancelled = false;

    const onPlay  = (t) => { if (suppressRef.current) return; setIsPlaying(true);  socket?.emit('watch-control', { hangoutId, action: 'play',  t }); };
    const onPause = (t) => { if (suppressRef.current) return; setIsPlaying(false); socket?.emit('watch-control', { hangoutId, action: 'pause', t }); };

    (async () => {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      if (divRef.current) divRef.current.innerHTML = '';

      let p;
      if      (source === 'youtube') p = await initYouTube  (divRef.current, videoId, { onPlay, onPause });
      else if (source === 'vimeo')   p = await initVimeo    (divRef.current, videoId, { onPlay, onPause });
      else if (source === 'local')   p = await initLocalFile(divRef.current, localObjectUrlRef.current, { onPlay, onPause });
      else                           p = await initDirect   (divRef.current, videoId, { onPlay, onPause });

      if (!cancelled) playerRef.current = p;
      else            p.destroy();
    })();

    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  // socket and hangoutId are included so onPlay/onPause closures are never stale
  }, [videoId, source, localFileReady, socket, hangoutId]);

  // ── Apply remote video (partner started something) ─────────────
  useEffect(() => {
    if (!remoteVideo) return;
    if (remoteVideo.videoId !== videoId || remoteVideo.source !== source) {
      setVideoId(remoteVideo.videoId);
      setSource(remoteVideo.source);
      // Reset sync state for new content
      setSyncReady(false); setPartnerReady(false);
      setCountdown(null);  setWatchingSince(null); setElapsed(0);
      clearInterval(countdownRef.current); clearInterval(elapsedRef.current);
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
      if (!vid) { setError("Couldn't read that YouTube link — try copying it from the address bar"); return; }
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

  const changeVideo = () => {
    if (localObjectUrlRef.current) { URL.revokeObjectURL(localObjectUrlRef.current); localObjectUrlRef.current = null; }
    setSyncReady(false); setPartnerReady(false);
    setCountdown(null);  setWatchingSince(null); setElapsed(0);
    clearInterval(countdownRef.current); clearInterval(elapsedRef.current);
    setVideoId(null); setSource(null); setUrlInput(''); setIsPlaying(false); setLocalFileReady(false);
  };

  // ── Streaming sync: toggle ready ───────────────────────────────
  const toggleReady = () => {
    const next = !syncReady;
    setSyncReady(next);
    socket?.emit('watch-ready', { hangoutId, ready: next });
    // If un-readying after countdown started, cancel it
    if (!next) { clearInterval(countdownRef.current); setCountdown(null); }
  };

  const resync = () => {
    clearInterval(countdownRef.current); clearInterval(elapsedRef.current);
    setSyncReady(false); setPartnerReady(false);
    setCountdown(null);  setWatchingSince(null); setElapsed(0);
    socket?.emit('watch-ready', { hangoutId, ready: false });
  };

  // ── Local file selected ────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localObjectUrlRef.current) URL.revokeObjectURL(localObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    localObjectUrlRef.current = url;
    setLocalFileReady(true);
    setError('');
    setVideoId(file.name);
    setSource('local');
    socket?.emit('watch-start', { hangoutId, videoId: file.name, source: 'local' });
  };

  // ── Helpers ────────────────────────────────────────────────────
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="px-5 pb-6 flex flex-col gap-4">
      {/* Single always-mounted file input — avoids duplicate ref issues */}
      <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileSelect} />

      {/* ── You are sharing your screen ────────────────────────── */}
      {isScreenSharing && (
        <div className="rounded-2xl overflow-hidden flex flex-col gap-0"
          style={{ border: '1px solid rgba(0,180,255,0.35)', background: 'rgba(0,180,255,0.07)' }}>
          {/* Mini live preview */}
          <div style={{ aspectRatio: '16/9', background: '#000', position: 'relative' }}>
            <video
              ref={screenPreviewRef}
              autoPlay muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(0,180,255,0.85)', color: '#fff' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Sharing
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold" style={{ color: '#00E5A0' }}>Your friend can see your screen</p>
            <button onClick={onStopScreenShare}
              className="flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl transition-all active:scale-95"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
              <MonitorOff size={13} /> Stop
            </button>
          </div>
        </div>
      )}

      {/* ── Friend is sharing their screen ──────────────────────── */}
      {!isScreenSharing && source === 'screen' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(0,180,255,0.15)', color: '#00E5A0', border: '1px solid rgba(0,180,255,0.3)' }}>
              Screen share
            </span>
            <span className="text-gray-600 text-xs">live from their computer ✨</span>
          </div>
          <div className="rounded-2xl overflow-hidden w-full" style={{ aspectRatio: '16/9', background: '#111' }}>
            {remoteScreenStream ? (
              <video
                ref={remoteScreenRef}
                autoPlay muted playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <Monitor size={28} style={{ color: '#4B5563' }} />
                <p className="text-gray-600 text-xs">Connecting to their screen…</p>
              </div>
            )}
          </div>
          <button onClick={() => { setVideoId(null); setSource(null); }}
            className="w-full py-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6B7280' }}>
            Leave screen share
          </button>
        </div>
      )}

      {!isScreenSharing && source !== 'screen' && (!videoId ? (
        <>
          {/* Source tiles — 2×2 + streaming full-width */}
          <div className="grid grid-cols-2 gap-2">
            {['youtube', 'vimeo', 'direct', 'local'].map(key => (
              <div key={key} className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="font-bold text-xs mb-0.5" style={{ color: SOURCES[key].color }}>{SOURCES[key].label}</p>
                <p className="text-gray-700" style={{ fontSize: '0.6rem', lineHeight: 1.4 }}>{SOURCES[key].hint}</p>
              </div>
            ))}
            {/* Streaming — full width */}
            <div className="col-span-2 rounded-2xl p-3 text-center"
              style={{ background: 'rgba(229,9,20,0.04)', border: '1px solid rgba(229,9,20,0.12)' }}>
              <p className="font-bold text-xs mb-0.5" style={{ color: SOURCES.external.color }}>
                {SOURCES.external.label}
              </p>
              <p className="text-gray-700" style={{ fontSize: '0.6rem', lineHeight: 1.4 }}>{SOURCES.external.hint}</p>
            </div>
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
              style={{ background: 'linear-gradient(135deg,#00B4FF,#00E5A0)', color: '#020C18', minHeight: 58 }}
              onClick={handleLoad}>
              Watch
            </button>
          </div>

          {/* Local file picker */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
            <FolderOpen size={15} />
            Play a file from your computer
          </button>

          {/* Screen share */}
          {onStartScreenShare && (
            <button
              onClick={onStartScreenShare}
              className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(0,180,255,0.1)', border: '1px solid rgba(0,180,255,0.25)', color: '#00E5A0' }}>
              <Monitor size={15} />
              Share your screen
            </button>
          )}

          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
        </>

      ) : source === 'external' ? (
        /* ── Streaming sync UI ──────────────────────────────────── */
        (() => {
          const svc = getServiceInfo(videoId);
          return (
            <>
              {/* Service badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{ background: `${svc.color}20`, color: svc.color, border: `1px solid ${svc.color}40` }}>
                  {svc.name}
                </span>
                <button onClick={changeVideo} title="Change video"
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7280' }}>
                  <Film size={14} />
                </button>
              </div>

              {/* Instructions card */}
              <div className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-white font-semibold text-sm mb-1">How this works</p>
                <ol className="text-gray-500 text-xs flex flex-col gap-1" style={{ listStyle: 'decimal', paddingLeft: '1rem' }}>
                  <li>Both of you open the link below in {svc.name}</li>
                  <li>Navigate to the same episode / movie</li>
                  <li>Pause at the very beginning, then tap <strong className="text-white">I'm ready!</strong></li>
                  <li>A 3-2-1 countdown fires — both press play at the same moment</li>
                </ol>
              </div>

              {/* Open link button */}
              <a href={videoId} target="_blank" rel="noopener noreferrer"
                className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: `${svc.color}18`, border: `1px solid ${svc.color}35`, color: svc.color }}>
                <ExternalLink size={15} />
                Open in {svc.name}
              </a>

              {/* Countdown OR ready state */}
              {countdown !== null ? (
                <CountdownBubble value={countdown} />
              ) : watchingSince ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-white font-semibold text-sm">Watching together</p>
                  <p className="font-mono text-3xl font-black" style={{ color: svc.color }}>{fmtTime(elapsed)}</p>
                  <button onClick={resync}
                    className="flex items-center gap-1.5 text-xs font-medium py-2 px-4 rounded-xl transition-all active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#9CA3AF' }}>
                    <RefreshCw size={12} /> Resync
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Ready status row */}
                  <div className="flex items-center justify-around py-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold"
                        style={{ background: syncReady ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', border: `2px solid ${syncReady ? '#10B981' : 'rgba(255,255,255,0.1)'}` }}>
                        {syncReady ? '✓' : '…'}
                      </div>
                      <p className="text-xs" style={{ color: syncReady ? '#10B981' : '#6B7280' }}>You</p>
                    </div>
                    <p className="text-gray-700 text-xs">waiting for both</p>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold"
                        style={{ background: partnerReady ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', border: `2px solid ${partnerReady ? '#10B981' : 'rgba(255,255,255,0.1)'}` }}>
                        {partnerReady ? '✓' : '…'}
                      </div>
                      <p className="text-xs" style={{ color: partnerReady ? '#10B981' : '#6B7280' }}>Friend</p>
                    </div>
                  </div>

                  <button onClick={toggleReady}
                    className="w-full font-bold py-3 rounded-2xl text-sm transition-all active:scale-[0.97]"
                    style={syncReady
                      ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981' }
                      : { background: 'linear-gradient(135deg,#00B4FF,#00E5A0)', color: '#020C18', boxShadow: '0 0 20px rgba(0,180,255,0.3)' }}>
                    {syncReady ? "Waiting for your friend…" : "I'm ready!"}
                  </button>
                </div>
              )}
            </>
          );
        })()

      ) : (
        /* ── Embedded player (YouTube / Vimeo / Direct / Local) ─── */
        <>
          {/* Source badge */}
          {source && SOURCES[source] && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{ background: `${SOURCES[source].color}20`, color: SOURCES[source].color, border: `1px solid ${SOURCES[source].color}40` }}>
                {SOURCES[source].label}
              </span>
              <span className="text-gray-600 text-xs">synced in real time ✨</span>
            </div>
          )}

          {/* Partner-is-watching-local prompt */}
          {source === 'local' && !localFileReady && (
            <div className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#10B981' }}>
                Your friend is watching <span style={{ fontStyle: 'italic' }}>"{videoId}"</span>
              </p>
              <p className="text-gray-500 text-xs mb-3">Select your copy of the same file to stay in sync</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="font-bold py-2 px-5 rounded-xl text-sm flex items-center gap-2 mx-auto transition-all active:scale-95"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10B981' }}>
                <FolderOpen size={14} /> Pick my copy
              </button>
            </div>
          )}

          {/* 16:9 player container */}
          <div className="rounded-2xl overflow-hidden w-full"
            style={{ aspectRatio: '16/9', background: '#000', display: source === 'local' && !localFileReady ? 'none' : 'block' }}>
            <div ref={divRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button onClick={togglePlay}
              className="flex-1 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg,#00B4FF,#00E5A0)', color: '#020C18', boxShadow: '0 0 20px rgba(0,180,255,0.3)' }}>
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
      ))}
    </div>
  );
}
