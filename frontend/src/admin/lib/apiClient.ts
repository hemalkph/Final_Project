import axios from 'axios';

/**
 * Single Axios instance for the admin app. Every mutating call goes through
 * this — fixes the pre-existing bug where Agent CRUD omitted the
 * Authorization header entirely (see migration plan §9), since the
 * interceptor below attaches it unconditionally.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    }
    return Promise.reject(error);
  },
);
