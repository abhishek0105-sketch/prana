import { useEffect, useRef } from 'react';
import { MicOff, VideoOff, AlertCircle, Wifi } from 'lucide-react';

const initials = (name) =>
  name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

// ── Single video tile ──────────────────────────────────────────
function Tile({ stream, name, color, isLocal, muted, camOff, camError, connected = true }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = stream && !camOff && !camError;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
      style={{
        background: '#0D0D1A',
        border: isLocal
          ? '2px solid rgba(0,180,255,0.5)'
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isLocal
          ? '0 0 20px rgba(0,180,255,0.2)'
          : 'none',
        minHeight: 80,
      }}>

      {/* Video */}
      {showVideo && (
        <video
          ref={videoRef}
          autoPlay playsInline
          muted={isLocal}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Avatar placeholder when no video */}
      {!showVideo && (
        <div className="flex flex-col items-center gap-2 z-10">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white"
            style={{ background: color || 'linear-gradient(135deg,#00B4FF,#00E5A0)' }}>
            {initials(name)}
          </div>
          {camError && (
            <div className="flex items-center gap-1 text-yellow-400 text-xs font-semibold">
              <AlertCircle size={12} /> No camera
            </div>
          )}
        </div>
      )}

      {/* Waiting / connecting indicator */}
      {!isLocal && !connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 z-20">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white"
            style={{ background: color || 'linear-gradient(135deg,#00B4FF,#00E5A0)' }}>
            {initials(name)}
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Joining...
          </div>
        </div>
      )}

      {/* Bottom overlay: name + indicators */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 flex items-end justify-between z-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
        <span className="text-white text-xs font-bold truncate max-w-[70%]">
          {isLocal ? 'You' : name}
        </span>
        <div className="flex items-center gap-1">
          {muted  && <div className="bg-red-500/80 rounded-full p-0.5"><MicOff  size={10} color="white" /></div>}
          {camOff && <div className="bg-gray-700/80 rounded-full p-0.5"><VideoOff size={10} color="white" /></div>}
        </div>
      </div>
    </div>
  );
}

// ── Grid layout engine ─────────────────────────────────────────
function getLayout(total) {
  // Returns { cols, style, pipLocal } based on participant count
  if (total <= 2) return { cols: 1, pipLocal: true  };   // full-screen + pip
  if (total <= 4) return { cols: 2, pipLocal: false };   // 2×2
  if (total <= 6) return { cols: 2, pipLocal: false };   // 2×3
  return              { cols: 3, pipLocal: false };      // 3 columns for 7+
}

// ── Main VideoGrid ─────────────────────────────────────────────
export default function VideoGrid({
  localStream, localCamOff, localCamError, localMuted,
  peers,   // [{ userId, name, color, stream, muted, camOff, connected }]
  user,
}) {
  const total = peers.length + 1; // peers + local
  const { cols, pipLocal } = getLayout(total);

  // pip mode (1 remote): full-screen remote + small local
  if (pipLocal && peers.length <= 1) {
    const peer = peers[0];
    return (
      <div className="relative w-full h-full bg-black">
        {/* Remote full-screen */}
        <div className="absolute inset-0">
          {peer
            ? <Tile {...peer} />
            : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-8"
                style={{ background: '#0D0D1A' }}>
                <div className="text-5xl animate-pulse">👋</div>
                <p className="text-white font-display font-bold text-lg">Waiting for someone to join...</p>
                <p className="text-gray-500 text-sm">Tap the 👤+ button to invite a buddy</p>
              </div>
            )
          }
        </div>

        {/* Local pip — bottom-right */}
        <div className="absolute bottom-4 right-4 w-28 rounded-2xl overflow-hidden z-10"
          style={{ aspectRatio: '3/4', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
          <Tile
            stream={localStream}
            name={user?.name}
            color={user?.avatar_color}
            isLocal
            muted={localMuted}
            camOff={localCamOff}
            camError={localCamError}
            connected
          />
        </div>
      </div>
    );
  }

  // Grid mode: all tiles equal size
  return (
    <div className="w-full h-full p-1.5 overflow-y-auto"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 6,
        alignContent: 'start',
      }}>

      {peers.map(peer => (
        <div key={peer.userId} style={{ aspectRatio: '3/4' }}>
          <Tile {...peer} />
        </div>
      ))}

      {/* Local tile always last */}
      <div style={{ aspectRatio: '3/4' }}>
        <Tile
          stream={localStream}
          name={user?.name}
          color={user?.avatar_color}
          isLocal
          muted={localMuted}
          camOff={localCamOff}
          camError={localCamError}
          connected
        />
      </div>
    </div>
  );
}
