import axios from 'axios';

const PRIMARY_PROD_API_ORIGIN = 'https://unifyr-production.onrender.com';
const SECONDARY_PROD_API_ORIGIN = 'https://unifyr-production.up.railway.app';

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

  return PRIMARY_PROD_API_ORIGIN;
};

const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN
  ? import.meta.env.VITE_API_ORIGIN.replace(/\/$/, '')
  : null;

const fallbackApiOrigins = configuredApiOrigin
  ? [configuredApiOrigin]
  : [PRIMARY_PROD_API_ORIGIN, SECONDARY_PROD_API_ORIGIN];

let activeApiOrigin = (configuredApiOrigin || getDefaultApiOrigin()).replace(/\/$/, '');
let activeFallbackIndex = fallbackApiOrigins.findIndex((origin) => origin === activeApiOrigin);
if (activeFallbackIndex < 0) activeFallbackIndex = 0;

export const getApiOrigin = () => activeApiOrigin;
export const API_ORIGIN = activeApiOrigin;
export const API_BASE_URL = `${activeApiOrigin}/api`;

const axiosInstance = axios.create({
  baseURL: `${activeApiOrigin}/api`,
  withCredentials: true,
  timeout: 30000, // bumped from 15s → 30s for slow mobile networks
});

// Retry on network errors and automatically fail over to secondary backend if primary is unavailable.
axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const noServerOnRender = err.response?.headers?.['x-render-routing'] === 'no-server';
    const isNetworkError = !err.response && err.code !== 'ERR_CANCELED';
    const retryCount = err.config._retryCount || 0;
    const canTryNextOrigin = !configuredApiOrigin && activeFallbackIndex < fallbackApiOrigins.length - 1;

    if ((isNetworkError || noServerOnRender) && canTryNextOrigin && !err.config?._retriedWithNextOrigin) {
      activeFallbackIndex += 1;
      activeApiOrigin = fallbackApiOrigins[activeFallbackIndex];
      axiosInstance.defaults.baseURL = `${activeApiOrigin}/api`;
      err.config._retriedWithNextOrigin = true;
      err.config.baseURL = `${activeApiOrigin}/api`;
      return axiosInstance(err.config);
    }

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
