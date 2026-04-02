import axios from 'axios';

const getDefaultApiOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const { hostname, origin } = window.location;
  return ['localhost', '127.0.0.1'].includes(hostname) ? 'http://localhost:5000' : origin;
};

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || getDefaultApiOrigin()).replace(/\/$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default axiosInstance;
