import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) { socket?.disconnect(); setSocket(null); return; }

    const token = localStorage.getItem('prana_token');

    // Dev: connect through Vite proxy (single origin, HTTPS handled automatically)
    // Prod: connect directly to Railway backend URL
    const SERVER = import.meta.env.VITE_API_URL || '/';

    const s = io(SERVER, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect',       ()  => console.log('[socket] connected'));
    s.on('connect_error', (e) => console.warn('[socket] error:', e.message));

    setSocket(s);
    return () => s.disconnect();
  }, [user?.id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
