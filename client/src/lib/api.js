import axios from 'axios';

// In development Vite proxies /api → localhost:4000, so baseURL = '/api'
// In production (Vercel) we call the Railway backend directly
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('prana_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // Token expired or invalid — clear it and send user to login
    if (err.response?.status === 401) {
      localStorage.removeItem('prana_token');
      // Only redirect if we're not already on the welcome/auth page
      if (!window.location.pathname.match(/^\/(auth)?$/)) {
        window.location.href = '/';
      }
    }
    return Promise.reject(err.response?.data || { error: 'Network error' });
  }
);

export default api;
