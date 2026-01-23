export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerifiedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user?: User;
  message?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface GetUserInfoResponse {
  data: {
    user: User;
  };
}
