import { useState } from 'react';
import { Play, Pause, SkipBack, Tv, Send, CheckCircle } from 'lucide-react';

// Detect streaming source from URL
function detectSource(url) {
  const u = url.toLowerCase();
  if (/youtu\.be|youtube\.com/.test(u))        return 'youtube';
  if (/vimeo\.com/.test(u))                    return 'vimeo';
  if (/netflix|amazon|primevideo|disneyplus|max\.com|hulu|peacock|paramount|crunchyroll|apple\.com\/tv/i.test(u)) return 'external';
  return 'direct';
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

const QUICK = [
  { label: 'YouTube',     color: '#FF0000', url: '' },
  { label: 'Netflix',     color: '#E50914', url: 'https://netflix.com' },
  { label: 'Prime Video', color: '#00A8E1', url: 'https://primevideo.com' },
  { label: 'Disney+',     color: '#113CCF', url: 'https://disneyplus.com' },
  { label: 'Max',         color: '#002BE7', url: 'https://max.com' },
  { label: 'Hulu',        color: '#1CE783', url: 'https://hulu.com' },
];

export default function TVControl() {
  const [urlInput,   setUrlInput]   = useState('');
  const [sent,       setSent]       = useState(false);
  const [error,      setError]      = useState('');
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [hasVideo,   setHasVideo]   = useState(false);
  const [sending,    setSending]    = useState(false);

  const code = new URLSearchParams(window.location.search).get('code') || '';

  const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api/tv/${code}`;

  // Auth header helper — reads JWT from localStorage the same way api.js does
  const authHeaders = () => {
    const token = localStorage.getItem('prana_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // ── Send video to TV ──────────────────────────────────────────
  const sendVideo = async () => {
    const url = urlInput.trim();
    if (!url) { setError('Paste a video link first'); return; }

    const source = detectSource(url);
    let videoId  = url;

    if (source === 'youtube') {
      videoId = extractYouTubeId(url);
      if (!videoId) { setError("Couldn't read that YouTube link"); return; }
    }

    setSending(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/video`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ videoId, source }),
      });
      if (!res.ok) throw new Error('Server error');
      setSent(true);
      setHasVideo(true);
      setIsPlaying(true);
      setTimeout(() => setSent(false), 2500);
    } catch {
      setError('Could not reach the TV — make sure the code is correct');
    }
    setSending(false);
  };

  // ── Send control command to TV ────────────────────────────────
  const sendControl = async (action, t = 0) => {
    try {
      await fetch(`${API_BASE}/control`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ action, t }),
      });
      if (action === 'play')  setIsPlaying(true);
      if (action === 'pause') setIsPlaying(false);
    } catch {}
  };

  if (!code) {
    return (
      <div className="h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Tv size={48} style={{ color: '#00B4FF' }} />
        <p className="text-white font-bold text-xl">No TV code found</p>
        <p className="text-gray-500">Open this page by scanning the QR code on your TV</p>
        <a href="/home" className="btn-primary text-sm px-6 py-3 mt-2">Go Home</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-5 pb-10">

      {/* Header */}
      <div className="pt-10 pb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,180,255,0.15)', border: '1px solid rgba(0,180,255,0.3)' }}>
          <Tv size={20} style={{ color: '#00B4FF' }} />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-tight">TV Remote</p>
          <p className="text-gray-600 text-sm">
            Controlling <span className="font-mono font-bold" style={{ color: '#00E5A0' }}>{code}</span>
          </p>
        </div>
      </div>

      {/* URL input */}
      <div className="flex flex-col gap-3 mb-6">
        <p className="text-gray-400 text-sm font-semibold">Send a video to the TV</p>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Paste any YouTube or video link…"
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setError(''); setSent(false); }}
            onKeyDown={e => e.key === 'Enter' && sendVideo()}
            autoFocus
          />
          <button
            onClick={sendVideo}
            disabled={sending}
            className="font-bold rounded-2xl px-5 text-sm flex-shrink-0 flex items-center gap-2 transition-all active:scale-95"
            style={{
              background: sent ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#00B4FF,#00E5A0)',
              border: sent ? '1px solid rgba(16,185,129,0.4)' : 'none',
              color: sent ? '#10B981' : '#020C18',
              minHeight: 58, minWidth: 80,
              opacity: sending ? 0.7 : 1,
            }}>
            {sent ? <><CheckCircle size={16} /> Sent!</> : <><Send size={16} /> Send</>}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Quick service tiles */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {QUICK.filter(q => q.url).map(q => (
          <button key={q.label}
            onClick={() => { setUrlInput(q.url); }}
            className="rounded-2xl py-3 px-2 text-center text-xs font-bold transition-all active:scale-95"
            style={{ background: `${q.color}12`, border: `1px solid ${q.color}30`, color: q.color }}>
            {q.label}
          </button>
        ))}
      </div>

      {/* Playback controls — shown after video sent */}
      {hasVideo && (
        <div className="rounded-3xl p-5 flex flex-col gap-4"
          style={{ background: 'rgba(0,180,255,0.07)', border: '1px solid rgba(0,180,255,0.2)' }}>
          <p className="text-white font-bold text-sm">Playback controls</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => sendControl('seek', 0)}
              className="w-14 h-14 flex items-center justify-center rounded-2xl transition-all active:scale-90"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF' }}>
              <SkipBack size={20} />
            </button>
            <button
              onClick={() => sendControl(isPlaying ? 'pause' : 'play')}
              className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg,#00B4FF,#00E5A0)', color: '#020C18' }}>
              {/* t=0 is always sent, so this effectively restarts + plays */}
            {isPlaying ? <><Pause size={20} /> Pause on TV</> : <><SkipBack size={20} /> Restart & Play</>}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-gray-400 text-xs leading-relaxed">
          <strong className="text-white">How it works:</strong> Paste a YouTube or video URL above and tap Send. The video starts playing on the TV immediately. Use the playback controls to play, pause, or restart from your phone.
          <br/><br/>
          For Netflix / streaming: tap the service tile to set it, then both you and the TV open the same title. Use your normal Watch Together sync countdown.
        </p>
      </div>
    </div>
  );
}
