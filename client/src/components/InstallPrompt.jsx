import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [prompt, setPrompt]   = useState(null);  // the deferred install event
  const [show, setShow]       = useState(false);
  const [isIos, setIsIos]     = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (dismissed) return;

    // Detect iOS (Safari shows "Add to Home Screen" manually)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    if (ios) { setIsIos(true); setShow(true); return; }

    // Android / Chrome — listen for the browser's install prompt
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
  };

  const dismiss = () => { setShow(false); setDismissed(true); };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 fade-in max-w-sm mx-auto">
      <div className="rounded-3xl p-4 flex items-center gap-4"
        style={{
          background: 'rgba(10,10,10,0.97)',
          border: '1px solid rgba(139,92,246,0.4)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 40px rgba(139,92,246,0.25)',
        }}>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #F472B6)' }}>
          <span className="text-2xl">✨</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight">Install PRANA</p>
          {isIos
            ? <p className="text-gray-500 text-xs mt-0.5">Tap <strong>Share →</strong> then <strong>"Add to Home Screen"</strong></p>
            : <p className="text-gray-500 text-xs mt-0.5">Add to your home screen — works like a real app</p>
          }
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIos && (
            <button onClick={install}
              className="flex items-center gap-1.5 font-bold rounded-xl px-3 py-2 text-xs"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #F472B6)', color: '#fff' }}>
              <Download size={13} /> Install
            </button>
          )}
          <button onClick={dismiss}
            className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#6B7280' }}>
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
