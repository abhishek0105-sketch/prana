import { VideoOff, CameraOff, AlertCircle } from 'lucide-react';

export default function VideoRoom({ localRef, remoteRef, peerConnected, friend, camOff, camError, camErrorReason, user }) {
  const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="relative w-full h-full bg-black">

      {/* ── Remote video (full screen) ─────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center bg-surface">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ display: peerConnected ? 'block' : 'none' }}
        />

        {!peerConnected && (
          <div className="flex flex-col items-center gap-4 px-8 text-center">
            {friend ? (
              <>
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black animate-pulse-slow"
                  style={{ background: friend.color || '#F59E0B', color: '#07070F' }}>
                  {initials(friend.name)}
                </div>
                <div>
                  <p className="text-white font-bold text-xl">{friend.name}</p>
                  <p className="text-gray-400 text-sm mt-1 flex items-center gap-2 justify-center">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
                    Waiting to join...
                  </p>
                  <p className="text-gray-600 text-xs mt-3 max-w-xs">
                    Share the hangout link or ask them to click "Hang Out" from their home screen
                  </p>
                </div>
              </>
            ) : (
              <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* ── Local video (picture-in-picture) ──────────────── */}
      <div className="absolute bottom-4 right-4 w-28 h-36 rounded-2xl overflow-hidden border-2 border-surface2 bg-surface2 z-10"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>

        {camError ? (
          /* Camera permission denied or device busy */
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-surface2 px-2">
            <AlertCircle size={18} className="text-yellow-500" />
            <span className="text-yellow-400 text-xs font-semibold text-center leading-tight">
              {camErrorReason === 'busy'
                ? 'Cam in use by other tab'
                : 'No camera access'}
            </span>
          </div>
        ) : camOff ? (
          /* User turned camera off */
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-surface2">
            <CameraOff size={18} className="text-gray-500" />
            <span className="text-gray-500 text-xs font-medium">Cam off</span>
          </div>
        ) : (
          /* Normal video */
          <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}

        <div className="absolute bottom-1.5 left-0 right-0 text-center">
          <span className="text-white text-xs font-bold bg-black/60 px-2 py-0.5 rounded-full">You</span>
        </div>
      </div>

      {/* ── Camera busy warning banner ─────────────────────── */}
      {camError && camErrorReason === 'busy' && (
        <div className="absolute bottom-44 right-2 left-2 bg-yellow-950/90 border border-yellow-800 rounded-2xl px-4 py-3 text-xs text-yellow-300 z-20 text-center">
          💡 <strong>Testing on 1 computer?</strong> Your webcam can only be used by one tab at a time.
          The other person's video will still come through — try with a second device for full two-way video.
        </div>
      )}
    </div>
  );
}
