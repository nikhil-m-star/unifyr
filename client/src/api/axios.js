import axios from 'axios';

const FALLBACK_PROD_API_ORIGIN = 'https://unifyr-production.up.railway.app';

const getDefaultApiOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const { hostname, origin } = window.location;

  if (['localhost', '127.0.0.1'].includes(hostname)) {
    return 'http://localhost:5000';
  }

  if (hostname.endsWith('railway.app')) {
    return origin;
  }

  return FALLBACK_PROD_API_ORIGIN;
};

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || getDefaultApiOrigin()).replace(/\/$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default axiosInstance;
