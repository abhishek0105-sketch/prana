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
  (err) => Promise.reject(err.response?.data || { error: 'Network error' })
);

export default api;
