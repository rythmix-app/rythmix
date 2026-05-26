import { getToken, getRefreshToken } from "./storage";
import { ApiError } from "@/types/auth";
import { AUTH_ERROR_CODE } from "@/utils/error-messages";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 15000;

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
  skipRefresh?: boolean; // Skip the 401→refresh→retry loop (used internally after retry, and externally by /api/auth/refresh itself to avoid recursion)
}

const buildApiError = async (response: Response): Promise<ApiError> => {
  let code: string | undefined;
  let message = `Erreur ${response.status}`;
  try {
    const errorData = await response.json();
    if (typeof errorData?.code === "string") {
      code = errorData.code;
    }
    if (typeof errorData?.message === "string") {
      message = errorData.message;
    }
  } catch {
    // body was not JSON — keep the default message
  }

  return { code, message, statusCode: response.status };
};

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
      code: AUTH_ERROR_CODE.NoRefreshToken,
      message: "No refresh token available",
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
    // Skip the refresh loop on requests already retried or on the refresh
    // endpoint itself — otherwise handleTokenRefresh awaits its own promise.
    if (options.skipRefresh) {
      if (onUnauthorized) onUnauthorized();
      throw await buildApiError(response);
    }

    // Vérifier si on a un refreshToken
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      // Tenter le refresh
      return handleTokenRefresh(endpoint, { ...options, skipRefresh: true });
    } else {
      // Pas de refreshToken: déconnecter
      if (onUnauthorized) onUnauthorized();
      throw await buildApiError(response);
    }
  }

  if (!response.ok) {
    throw await buildApiError(response);
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

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
