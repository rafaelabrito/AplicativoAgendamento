import axios from "axios";
import { getApiErrorMessage } from './error';

const API_BASE_URL =
  (typeof process !== 'undefined' ? process.env.VITE_API_URL : undefined) ||
  (typeof window !== 'undefined' ? (window as any).__API_URL__ : undefined) ||
  "http://localhost:5000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    error.friendlyMessage = getApiErrorMessage(error);
    return Promise.reject(error);
  }
);

export default api;