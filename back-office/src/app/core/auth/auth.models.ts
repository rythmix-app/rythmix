import { User } from '../models/user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
  firstName?: string;
  lastName?: string;
}

export interface RegisterResponse {
  message: string;
  user?: User;
}

export interface UserResponse {
  data: {
    user: User;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface AuthError {
  message: string;
  errors?: {
    field: string;
    message: string;
  }[];
  statusCode?: number;
}
