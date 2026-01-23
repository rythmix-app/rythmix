import { create } from "zustand";
import { User, LoginCredentials, RegisterData } from "@/types/auth";
import * as authService from "@/services/authService";
import * as storage from "@/services/storage";
import {
  setUnauthorizedHandler,
  setTokenRefreshedHandler,
} from "@/services/api";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  // Handler pour déconnexion (401 sans refresh ou échec du refresh)
  setUnauthorizedHandler(() => {
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    storage.clearAll();
  });

  // Handler pour refresh réussi (met à jour le token dans le store)
  setTokenRefreshedHandler((newToken: string) => {
    set({ token: newToken });
  });

  return {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: true,

    login: async (credentials: LoginCredentials) => {
      set({ isLoading: true });
      try {
        const response = await authService.login(credentials);
        set({
          user: response.user,
          token: response.accessToken,
          refreshToken: response.refreshToken || null,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    register: async (data: RegisterData) => {
      set({ isLoading: true });
      try {
        await authService.register(data);
        set({ isLoading: false });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await authService.logout();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    checkAuth: async () => {
      set({ isInitializing: true });
      try {
        const token = await storage.getToken();
        const refreshToken = await storage.getRefreshToken();
        const user = await storage.getUser();

        if (token && user) {
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isInitializing: false,
          });
        } else {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isInitializing: false,
          });
        }
      } catch {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isInitializing: false,
        });
      }
    },
  };
});
