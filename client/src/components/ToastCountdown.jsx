import { useState, useEffect } from 'react';

export default function ToastCountdown({ by, onDone }) {
  const [count, setCount] = useState(3);
  const [phase, setPhase] = useState('countdown'); // countdown | toast | done

  useEffect(() => {
    if (phase === 'countdown') {
      if (count === 0) { setPhase('toast'); return; }
      const t = setTimeout(() => setCount(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
    if (phase === 'toast') {
      const t = setTimeout(() => { setPhase('done'); onDone(); }, 2500);
      return () => clearTimeout(t);
    }
  }, [count, phase]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(7,7,15,0.95)', backdropFilter: 'blur(12px)' }}>

      {phase === 'countdown' && (
        <div className="flex flex-col items-center gap-6 fade-in" key={count}>
          <p className="text-gray-400 text-xl font-semibold">Get your drink ready...</p>
          <div className="text-9xl font-black glow-text" style={{ color: '#F59E0B', fontSize: '10rem' }}>
            {count}
          </div>
          <p className="text-gray-500 text-base">{by ? `${by} started a toast!` : 'Raise your glass...'}</p>
        </div>
      )}

      {phase === 'toast' && (
        <div className="flex flex-col items-center gap-6 fade-in">
          <div className="text-9xl" style={{ fontSize: '8rem', animation: 'float 0.5s ease-in-out infinite alternate' }}>🥂</div>
          <h2 className="text-5xl font-black glow-text" style={{ color: '#F59E0B' }}>Cheers!</h2>
          <p className="text-gray-400 text-xl">To friendship 🎉</p>

          {/* Confetti dots */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="absolute w-3 h-3 rounded-full"
                style={{
                  background: ['#F59E0B','#8B5CF6','#10B981','#EF4444','#EC4899'][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${1 + Math.random() * 2}s ease-in-out infinite`,
                  opacity: 0.7
                }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
