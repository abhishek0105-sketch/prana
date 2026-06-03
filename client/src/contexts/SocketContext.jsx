import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) { socket?.disconnect(); setSocket(null); return; }

    const token  = localStorage.getItem('prana_token');
    const SERVER = import.meta.env.VITE_API_URL || '/';

    const s = io(SERVER, {
      auth:       { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay:    1000,
      reconnectionAttempts: Infinity, // keep trying — don't give up
    });

    s.on('connect',       ()  => console.log('[socket] connected'));
    s.on('connect_error', (e) => console.warn('[socket] error:', e.message));

    // Re-announce presence after any reconnect so friends don't see you as offline
    s.on('reconnect', () => {
      console.log('[socket] reconnected — re-emitting presence');
      s.emit('get-friend-presence');
      // The Home component will re-emit set-presence via its own effect
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user?.id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
