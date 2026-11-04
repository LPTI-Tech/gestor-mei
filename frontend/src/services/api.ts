import axios from 'axios';

// Garante que o baseURL aponte para /api mesmo se VITE_API_URL omitir o sufixo (ex: https://gestor-mei-api.onrender.com)
const rawBaseURL = import.meta.env.VITE_API_URL || '/api';
const baseURL = rawBaseURL.endsWith('/api')
  ? rawBaseURL
  : `${rawBaseURL.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  // Evita duplicação caso a rota chamada já inclua o prefixo /api/
  if ((config.baseURL === '/api' || config.baseURL?.endsWith('/api')) && config.url?.startsWith('/api/')) {
    config.url = config.url.replace(/^\/api/, '');
  }
  const token = localStorage.getItem('gestor_mei_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on unauthorized
      localStorage.removeItem('gestor_mei_token');
      localStorage.removeItem('gestor_mei_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
