import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Film } from 'lucide-react';

// Extract YouTube video ID from any YouTube URL format
function extractVideoId(url) {
  const patterns = [
    /youtu\.be\/([^?&#\s]+)/,
    /[?&]v=([^&#\s]+)/,
    /youtube\.com\/embed\/([^?&#\s]+)/,
    /youtube\.com\/shorts\/([^?&#\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Load the YouTube IFrame API once across all mounts
let ytReady = false;
let ytCallbacks = [];
function loadYT(cb) {
  if (window.YT?.Player) { cb(); return; }
  ytCallbacks.push(cb);
  if (!ytReady) {
    ytReady = true;
    window.onYouTubeIframeAPIReady = () => {
      ytCallbacks.forEach(fn => fn());
      ytCallbacks = [];
    };
    const tag = document.createElement('script');
    tag.src   = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
}

export default function WatchTogether({ hangoutId, socket, remoteVideoId, remoteControl }) {
  const [urlInput,  setUrlInput]  = useState('');
  const [videoId,   setVideoId]   = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error,     setError]     = useState('');

  const playerRef   = useRef(null);
  const divRef      = useRef(null);
  const suppressRef = useRef(false); // prevent echoing remote events back

  // ── Initialise YouTube player whenever videoId changes ──────────
  useEffect(() => {
    if (!videoId) return;

    loadYT(() => {
      // Destroy previous instance if any
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;

      // divRef.current gets replaced by the YouTube iframe
      playerRef.current = new window.YT.Player(divRef.current, {
        videoId,
        playerVars: {
          autoplay:       0,
          controls:       0,  // we render our own controls
          modestbranding: 1,
          rel:            0,
          playsinline:    1,
          fs:             0,
        },
        events: {
          onStateChange: (e) => {
            if (suppressRef.current) return;
            const t = playerRef.current?.getCurrentTime?.() || 0;
            if (e.data === 1) { // playing
              setIsPlaying(true);
              socket?.emit('watch-control', { hangoutId, action: 'play', t });
            } else if (e.data === 2) { // paused
              setIsPlaying(false);
              socket?.emit('watch-control', { hangoutId, action: 'pause', t });
            }
          },
        },
      });
    });

    return () => {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [videoId]);

  // ── Apply remote video change ────────────────────────────────────
  useEffect(() => {
    if (remoteVideoId && remoteVideoId !== videoId) {
      setVideoId(remoteVideoId);
    }
  }, [remoteVideoId]);

  // ── Apply remote control events ──────────────────────────────────
  useEffect(() => {
    if (!remoteControl || !playerRef.current) return;
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, 500);

    const p = playerRef.current;
    const { action, t } = remoteControl;
    if (action === 'play')  { p.seekTo(t, true); p.playVideo();  setIsPlaying(true);  }
    if (action === 'pause') { p.seekTo(t, true); p.pauseVideo(); setIsPlaying(false); }
    if (action === 'seek')  { p.seekTo(t, true); }
  }, [remoteControl]);

  // ── User loads a video ───────────────────────────────────────────
  const handleLoad = () => {
    const vid = extractVideoId(urlInput.trim());
    if (!vid) { setError('Paste a valid YouTube link'); return; }
    setError('');
    setVideoId(vid);
    socket?.emit('watch-start', { hangoutId, videoId: vid });
  };

  // ── Playback controls ────────────────────────────────────────────
  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) { p.pauseVideo(); } else { p.playVideo(); }
  };

  const restart = () => {
    const p = playerRef.current;
    if (!p) return;
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, 500);
    p.seekTo(0, true);
    p.playVideo();
    setIsPlaying(true);
    socket?.emit('watch-control', { hangoutId, action: 'play', t: 0 });
  };

  return (
    <div className="px-5 pb-6 flex flex-col gap-4">

      {!videoId ? (
        /* ── URL input ── */
        <>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <Film size={18} style={{ color: '#A78BFA' }} />
            </div>
            <p className="text-gray-400 text-sm leading-snug">
              Paste a YouTube link — both of you watch in perfect sync 🎬
            </p>
          </div>

          <div className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="youtube.com/watch?v=..."
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

          <div className="rounded-2xl p-4 text-xs text-gray-600"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="mb-1 font-semibold text-gray-500">Works with:</p>
            <p>youtube.com/watch?v=... &nbsp;·&nbsp; youtu.be/... &nbsp;·&nbsp; YouTube Shorts</p>
          </div>
        </>
      ) : (
        /* ── Video + controls ── */
        <>
          {/* 16:9 embed container */}
          <div className="rounded-2xl overflow-hidden w-full"
            style={{ aspectRatio: '16/9', background: '#000', position: 'relative' }}>
            <div ref={divRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="flex-1 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#F472B6)', color: '#fff', boxShadow: '0 0 20px rgba(139,92,246,0.35)' }}>
              {isPlaying ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Play</>}
            </button>
            <button onClick={restart}
              className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF' }}
              title="Restart from beginning">
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => { setVideoId(null); setUrlInput(''); setIsPlaying(false); }}
              className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF' }}
              title="Change video">
              <Film size={16} />
            </button>
          </div>

          <p className="text-gray-700 text-xs text-center">Controls sync for both of you in real time ✨</p>
        </>
      )}
    </div>
  );
}
