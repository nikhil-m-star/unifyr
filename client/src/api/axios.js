import axios from 'axios';

const getDefaultApiOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const { hostname } = window.location;

  if (['localhost', '127.0.0.1'].includes(hostname)) {
    return 'http://localhost:5000';
  }

  // Explicit env var always wins — set VITE_API_ORIGIN in Vercel dashboard
  return '';
};

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || getDefaultApiOrigin()).replace(/\/$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30s — handles slow mobile networks
});

// Retry up to 2 times on network errors with exponential backoff
axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isNetworkError = !err.response && err.code !== 'ERR_CANCELED';
    const retryCount = err.config._retryCount || 0;

    if (isNetworkError && retryCount < 2) {
      err.config._retryCount = retryCount + 1;
      const delay = 1500 * (retryCount + 1); // 1.5s, then 3s
      console.log(`[Axios] Network error, retry ${retryCount + 1}/2 in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      return axiosInstance(err.config);
    }

    return Promise.reject(err);
  }
);

export default axiosInstance;
