import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('prana_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('prana_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('prana_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('prana_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('prana_token');
    setUser(null);
  };

  const updateCity = async (city) => {
    await api.patch('/auth/city', { city });
    setUser(u => ({ ...u, city }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateCity }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
