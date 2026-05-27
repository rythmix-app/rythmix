import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";

import { BASE_URL, get, post } from "./api";
import {
  AuthResponse,
  GetUserInfoResponse,
  LoginCredentials,
  RefreshTokenResponse,
  RegisterData,
  User,
} from "@/types/auth";
import { clearAll, setRefreshToken, setToken, setUser } from "./storage";
import { OAUTH_REASON } from "@/utils/error-messages";

export type OAuthProvider = "google" | "spotify";

const OAUTH_CALLBACK_DEEP_LINK_PATH = "auth/oauth-callback";

const getVerifyDeepLinkUrl = (): string | undefined => {
  try {
    return Linking.createURL("verify-email");
  } catch {
    return undefined;
  }
};

const getVerifyDeepLinkUrl = (): string | undefined => {
  try {
    return Linking.createURL("verify-email");
  } catch {
    return undefined;
  }
};

export const getUserInfo = async (): Promise<User> => {
  const response = await get<GetUserInfoResponse>("/api/auth/me");
  const data = response?.data;
  return data.user;
};

export const login = async (
  credentials: LoginCredentials,
): Promise<AuthResponse> => {
  const response = await post<AuthResponse>("/api/auth/login", credentials, {
    skipAuth: true,
  });

  if (!response.accessToken) {
    throw {
      message: "Réponse invalide du serveur: token manquant",
      statusCode: 500,
    };
  }

  await setToken(response.accessToken);

  if (response.refreshToken) {
    await setRefreshToken(response.refreshToken);
  }

  if (response.user) {
    await setUser(response.user);
  } else {
    try {
      const userInfo = await getUserInfo();
      await setUser(userInfo);
      response.user = userInfo;
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      throw {
        message: "Impossible de récupérer les informations utilisateur",
        statusCode: 500,
      };
    }
  }

  return response;
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  return await post<AuthResponse>(
    "/api/auth/register",
    { ...data, verifyDeepLinkUrl: getVerifyDeepLinkUrl() },
    {
      skipAuth: true,
    },
  );
};

export const resendVerificationEmail = async (email: string): Promise<void> => {
  await post(
    "/api/auth/resend-verification",
    { email, verifyDeepLinkUrl: getVerifyDeepLinkUrl() },
    { skipAuth: true },
  );
};

export const logout = async (): Promise<void> => {
  await clearAll();
};

type CallbackParams = Record<string, string>;

const navigateToCallback = (params: CallbackParams): void => {
  router.replace({
    pathname: "/auth/oauth-callback",
    params,
  } as never);
};

const fetchSpotifyAuthorizeUrl = async (returnUrl: string): Promise<string> => {
  const url = `${BASE_URL}/api/auth/spotify/login/init?returnUrl=${encodeURIComponent(returnUrl)}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Spotify init failed: ${response.status}`);
  }
  const body = (await response.json()) as { authorizeUrl?: string };
  if (!body.authorizeUrl) {
    throw new Error("Spotify init returned no authorizeUrl");
  }
  return body.authorizeUrl;
};

export const startOAuthFlow = async (
  provider: OAuthProvider,
): Promise<void> => {
  const returnUrl = Linking.createURL(OAUTH_CALLBACK_DEEP_LINK_PATH);

  let authorizeUrl: string;
  try {
    if (provider === "google") {
      authorizeUrl = `${BASE_URL}/api/auth/google/redirect?returnUrl=${encodeURIComponent(returnUrl)}`;
    } else {
      authorizeUrl = await fetchSpotifyAuthorizeUrl(returnUrl);
    }
  } catch {
    navigateToCallback({
      status: "error",
      provider,
      reason: OAUTH_REASON.Error,
    });
    return;
  }

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, returnUrl);

  if (result.type === "success" && result.url) {
    const parsed = Linking.parse(result.url);
    const params: CallbackParams = { provider };
    for (const [key, value] of Object.entries(parsed.queryParams ?? {})) {
      if (typeof value === "string") params[key] = value;
    }
    navigateToCallback(params);
    return;
  }

  if (result.type === "cancel" || result.type === "dismiss") {
    navigateToCallback({
      status: "error",
      provider,
      reason: OAUTH_REASON.Cancelled,
    });
    return;
  }

  navigateToCallback({
    status: "error",
    provider,
    reason: OAUTH_REASON.Error,
  });
};

export const refreshAccessToken = async (
  refreshToken: string,
): Promise<RefreshTokenResponse> => {
  const response = await post<RefreshTokenResponse>(
    "/api/auth/refresh",
    { refreshToken },
    { skipAuth: true, skipRefresh: true },
  );

  if (!response.accessToken) {
    throw {
      message: "Réponse invalide du serveur: token manquant",
      statusCode: 500,
    };
  }

  // Sauvegarder immédiatement le nouveau token
  await setToken(response.accessToken);

  return response;
};
