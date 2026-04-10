import axios from 'axios';

const FALLBACK_PROD_API_ORIGIN = 'https://unifyr-production.onrender.com';

const isPrivateIPv4 = (hostname = '') => {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  const parts = hostname.split('.').map((value) => Number(value));
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;

  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 127) ||
    parts[0] === 0
  );
};

const getDefaultApiOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const { hostname, origin } = window.location;

  if (['localhost', '127.0.0.1'].includes(hostname)) {
    return 'http://localhost:5000';
  }

  if (hostname.endsWith('onrender.com')) {
    return origin;
  }

  // Mobile/LAN testing: if frontend is opened via local network IP, use same host on backend port 5000.
  if (isPrivateIPv4(hostname)) {
    return `http://${hostname}:5000`;
  }

  return FALLBACK_PROD_API_ORIGIN;
};

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || getDefaultApiOrigin()).replace(/\/$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // bumped from 15s → 30s for slow mobile networks
});

// Retry up to 2 times on network errors with exponential backoff
axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isNetworkError = !err.response && err.code !== 'ERR_CANCELED';
    const retryCount = err.config._retryCount || 0;

    if (isNetworkError && retryCount < 2) {
      err.config._retryCount = retryCount + 1;
      const delay = 1500 * (retryCount + 1); // 1.5s → 3s
      console.log(`[Axios] Network error, retry ${retryCount + 1}/2 in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      return axiosInstance(err.config);
    }

    return Promise.reject(err);
  }
);

export default axiosInstance;
