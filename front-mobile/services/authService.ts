import { get, post } from "./api";
import {
  AuthResponse,
  GetUserInfoResponse,
  LoginCredentials,
  RegisterData,
  User,
} from "@/types/auth";
import { clearAll, setRefreshToken, setToken, setUser } from "./storage";

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
  return await post<AuthResponse>("/api/auth/register", data, {
    skipAuth: true,
  });
};

export const logout = async (): Promise<void> => {
  await clearAll();
};
