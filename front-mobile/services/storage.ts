import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/types/auth";

const TOKEN_KEY = "@rythmix_token";
const REFRESH_TOKEN_KEY = "@rythmix_refresh_token";
const USER_KEY = "@rythmix_user";

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

export const setToken = async (token: string): Promise<void> => {
  try {
    if (!token || token.trim() === "") {
      throw new Error("Token cannot be empty");
    }
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error("Error setting token:", error);
    throw error;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Error removing token:", error);
    throw error;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Error getting refresh token:", error);
    return null;
  }
};

export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    if (!token || token.trim() === "") {
      throw new Error("Refresh token cannot be empty");
    }
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error("Error setting refresh token:", error);
    throw error;
  }
};

export const removeRefreshToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Error removing refresh token:", error);
    throw error;
  }
};

export const getUser = async (): Promise<User | null> => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

export const setUser = async (user: User): Promise<void> => {
  try {
    if (!user || !user.id) {
      throw new Error("User object is invalid");
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Error setting user:", error);
    throw error;
  }
};

export const clearAll = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  } catch (error) {
    console.error("Error clearing storage:", error);
    throw error;
  }
};
