import { getToken } from "./storage";
import { ApiError } from "@/types/auth";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    const error: ApiError = {
      message: "Non autorisé",
      statusCode: 401,
    };
    throw error;
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

  return handleResponse<T>(response);
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
