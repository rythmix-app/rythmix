import { getToken, getRefreshToken } from "./storage";
import { ApiError } from "@/types/auth";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Gestion du refresh en cours
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// Callback pour notifier le store du nouveau token
let onTokenRefreshed: ((token: string) => void) | null = null;

export const setTokenRefreshedHandler = (handler: (token: string) => void) => {
  onTokenRefreshed = handler;
};

// Handler pour déconnexion (401 sans refresh ou échec du refresh)
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

// File d'attente pour requêtes en attente pendant le refresh
type PendingRequest = {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  endpoint: string;
  options: RequestOptions;
};
let pendingRequests: PendingRequest[] = [];

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  _isRetry?: boolean; // Flag interne pour éviter les boucles infinies
}

// Fonction pour gérer le refresh du token
const handleTokenRefresh = async (
  endpoint: string,
  options: RequestOptions,
): Promise<any> => {
  // Si déjà en cours, attendre le refresh en cours
  if (isRefreshing && refreshPromise) {
    try {
      await refreshPromise;
      // Réessayer la requête avec le nouveau token
      return apiClient(endpoint, options);
    } catch (error) {
      throw error;
    }
  }

  // Premier 401: déclencher le refresh
  isRefreshing = true;
  const currentRefreshToken = await getRefreshToken();

  if (!currentRefreshToken) {
    isRefreshing = false;
    if (onUnauthorized) onUnauthorized();
    const error: ApiError = {
      message: "Non autorisé",
      statusCode: 401,
    };
    throw error;
  }

  // Import dynamique pour éviter circular dependency
  const { refreshAccessToken } = await import("./authService");

  refreshPromise = (async () => {
    try {
      const { accessToken } = await refreshAccessToken(currentRefreshToken);

      // Notifier le store Zustand
      if (onTokenRefreshed) {
        onTokenRefreshed(accessToken);
      }

      // Résoudre toutes les requêtes en attente
      const requests = [...pendingRequests];
      pendingRequests = [];

      requests.forEach(({ resolve, endpoint, options }) => {
        apiClient(endpoint, options)
          .then(resolve)
          .catch((error) => {
            // Ignorer les erreurs des requêtes en attente
            console.error("Error retrying pending request:", error);
          });
      });

      return accessToken;
    } catch (error) {
      // Échec du refresh: rejeter toutes les requêtes en attente
      const requests = [...pendingRequests];
      pendingRequests = [];

      requests.forEach(({ reject }) => reject(error));

      if (onUnauthorized) {
        onUnauthorized();
      }

      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  try {
    await refreshPromise;
    // Réessayer la requête originale
    return apiClient(endpoint, options);
  } catch (error) {
    throw error;
  }
};

const handleResponse = async <T>(
  response: Response,
  endpoint: string,
  options: RequestOptions,
): Promise<T> => {
  if (response.status === 401) {
    // Si c'est un retry, ne pas réessayer le refresh (éviter boucles infinies)
    if (options._isRetry) {
      if (onUnauthorized) onUnauthorized();
      const error: ApiError = {
        message: "Non autorisé",
        statusCode: 401,
      };
      throw error;
    }

    // Vérifier si on a un refreshToken
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      // Tenter le refresh
      return handleTokenRefresh(endpoint, { ...options, _isRetry: true });
    } else {
      // Pas de refreshToken: déconnecter
      if (onUnauthorized) onUnauthorized();
      const error: ApiError = {
        message: "Non autorisé",
        statusCode: 401,
      };
      throw error;
    }
  }

  if (!response.ok) {
    let errorMessage = "Une erreur est survenue";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = `Erreur ${response.status}`;
    }

    const error: ApiError = {
      message: errorMessage,
      statusCode: response.status,
    };
    throw error;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
};

export const apiClient = async <T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (fetchOptions.headers) {
    Object.assign(headers, fetchOptions.headers);
  }

  if (!skipAuth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  return handleResponse<T>(response, endpoint, options);
};

export const get = <T>(
  endpoint: string,
  options?: RequestOptions,
): Promise<T> => apiClient<T>(endpoint, { ...options, method: "GET" });

export const post = <T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });

export const put = <T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });

export const del = <T>(
  endpoint: string,
  options?: RequestOptions,
): Promise<T> => apiClient<T>(endpoint, { ...options, method: "DELETE" });

export const patch = <T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
