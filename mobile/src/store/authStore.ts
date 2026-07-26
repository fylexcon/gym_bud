/**
 * GymBud Mobile — Auth Store (Zustand)
 *
 * Manages authentication state, tokens, and user session.
 * Persists auth tokens to AsyncStorage for auto-login.
 */

import { create } from 'zustand';
import { User } from '../types/user';

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  refreshToken: null,

  // Set auth after login/signup
  setAuth: (user, accessToken, refreshToken) =>
    set({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken,
      refreshToken,
    }),

  // Partial user profile update (after onboarding, settings change)
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  // Clear everything on logout
  logout: () =>
    set({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    }),
}));
