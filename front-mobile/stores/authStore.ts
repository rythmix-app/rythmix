import { create } from "zustand";
import { router } from "expo-router";
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

let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Handler pour déconnexion (401 sans refresh ou échec du refresh)
  setUnauthorizedHandler(() => {
    const wasAuthenticated = get().isAuthenticated;
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    storage.clearAll().catch((error) => {
      console.error("Failed to clear storage on unauthorized:", error);
    });
    if (wasAuthenticated) {
      router.replace("/auth/login");
      if (onSessionExpired) {
        onSessionExpired();
      }
    }
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
      // isInitializing defaults to true on store creation; do not re-toggle it
      // on foreground revalidation, otherwise _layout.tsx unmounts the UI.
      try {
        const token = await storage.getToken();
        const refreshToken = await storage.getRefreshToken();
        const cachedUser = await storage.getUser();

        if (!token || !cachedUser) {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isInitializing: false,
          });
          return;
        }

        // Valider le token côté serveur (évite l'état "zombie" après expiration)
        try {
          const freshUser = await authService.getUserInfo();
          await storage.setUser(freshUser);
          set({
            user: freshUser,
            token,
            refreshToken,
            isAuthenticated: true,
            isInitializing: false,
          });
        } catch (error) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode !== undefined) {
            // Le serveur a répondu : setUnauthorizedHandler a déjà nettoyé
            // l'état si c'était un 401. Pour les autres erreurs (4xx/5xx),
            // ne pas restaurer la session cachée — la cohérence avec le
            // storage déjà nettoyé prime.
            set({ isInitializing: false });
          } else {
            // Erreur réseau / offline — garder la session cachée pour
            // ne pas déconnecter à tort.
            set({
              user: cachedUser,
              token,
              refreshToken,
              isAuthenticated: true,
              isInitializing: false,
            });
          }
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
