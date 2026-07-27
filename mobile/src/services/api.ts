/**
 * GymBud Mobile — API Client
 *
 * Axios instance pre-configured with:
 * - Base URL pointing to the FastAPI backend
 * - Auth interceptor that attaches the JWT from the Zustand store
 * - 401 response interceptor for automatic token refresh
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

// ─── Base URL ────────────────────────────────
// In development, we need different URLs per platform:
//   • iOS Simulator:     localhost works directly
//   • Android Emulator:  10.0.2.2 maps to the host machine's localhost
//   • Physical Device:   Use your computer's LAN IP (find via `ipconfig`)
//
// In production, this is your Render deployment URL.
//
// For physical device testing, replace the fallback below with your LAN IP:
//   e.g., 'http://192.168.1.42:8000'

function getDevBaseUrl(): string {
  if (Platform.OS === 'android') {
    // Android emulator routes 10.0.2.2 → host machine's localhost
    return 'http://10.0.2.2:8000';
  }
  // iOS simulator can use localhost directly
  return 'http://localhost:8000';
}

const API_BASE_URL = __DEV__
  ? getDevBaseUrl()
  : 'https://gymbud-api-4ufh.onrender.com';         // Production Render URL

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,                              // 30s (Gemini calls can be slow)
  headers: {
    'Content-Type': 'application/json',
  },
});


// ─── Request Interceptor: Attach JWT ─────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);


// ─── Response Interceptor: Handle 401 ────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and we haven't retried yet, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });

          // Update store with new tokens
          const { user } = useAuthStore.getState();
          if (user) {
            useAuthStore.getState().setAuth(user, data.access_token, data.refresh_token);
          }

          // Retry the original request with the new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed — force logout
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export { API_BASE_URL };
