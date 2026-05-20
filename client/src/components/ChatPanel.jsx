import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function ChatPanel({ messages, onSend, userId }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  const formatTime = (ts) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col" style={{ height: '50vh' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-sm">Say hi to your friend!</p>
          </div>
        )}
        {messages.map(m => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {!mine && <span className="text-xs text-gray-500 mb-1 ml-1">{m.sender_name}</span>}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-base font-medium ${mine
                ? 'bg-primary text-black rounded-br-sm'
                : 'bg-surface2 text-white rounded-bl-sm'}`}>
                {m.content}
              </div>
              <span className="text-xs text-gray-600 mt-1 mx-1">{formatTime(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-3 flex gap-3 border-t border-border">
        <input
          className="input flex-1 py-3 text-base"
          placeholder="Say something..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="p-3.5 rounded-2xl bg-primary text-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-40">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
