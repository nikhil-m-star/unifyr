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
  timeout: 15000,
});

// Retry once on network errors (ECONNABORTED, ERR_NETWORK) — not on 4xx/5xx
axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isNetworkError = !err.response && err.code !== 'ERR_CANCELED';
    if (isNetworkError && !err.config._retried) {
      err.config._retried = true;
      console.log('[Axios] Network error detected, retrying once in 1.5s...');
      await new Promise((r) => setTimeout(r, 1500));
      return axiosInstance(err.config);
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
