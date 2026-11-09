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

/**
 * Resolve caminhos de imagens em ambientes desacoplados (ex: Vercel + Render).
 * Se a URL for relativa (/api/...), prefixa com a base da API configurada no ambiente.
 */
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return undefined;
  }

  const trimmed = url.trim();

  // URLs absolutas, blob (uploads locais) ou data-uri mantêm-se inalteradas
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  const rawBase = import.meta.env.VITE_API_URL || '';
  if (!rawBase) {
    return trimmed;
  }

  const cleanBase = rawBase.replace(/\/+$/, '');

  // Se a URL iniciar com /api
  if (trimmed.startsWith('/api')) {
    if (cleanBase.endsWith('/api')) {
      return `${cleanBase}${trimmed.replace(/^\/api/, '')}`;
    }
    return `${cleanBase}${trimmed}`;
  }

  // Se for outro caminho relativo
  if (trimmed.startsWith('/')) {
    return `${cleanBase}${trimmed}`;
  }

  return `${cleanBase}/${trimmed}`;
}

api.interceptors.request.use((config) => {
  // Evita duplicação caso a rota chamada já inclua o prefixo /api/
  if ((config.baseURL === '/api' || config.baseURL?.endsWith('/api')) && config.url?.startsWith('/api/')) {
    config.url = config.url.replace(/^\/api/, '');
  }
  const token = localStorage.getItem('gestor_mei_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeEmpresaId = localStorage.getItem('gestor_mei_active_empresa_id');
  if (activeEmpresaId) {
    config.headers['X-Empresa-ID'] = activeEmpresaId;
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
