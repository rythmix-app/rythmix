import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { User } from "@/types/auth";

const TOKEN_KEY = "@rythmix_token";
const REFRESH_TOKEN_KEY = "@rythmix_refresh_token";
const USER_KEY = "@rythmix_user";

// Détection de plateforme native (iOS/Android)
const isNative = Platform.OS === "ios" || Platform.OS === "android";

// Fonctions de stockage sécurisé conditionnel
const secureSet = async (key: string, value: string): Promise<void> => {
  if (isNative) {
    await SecureStore.setItemAsync(key, value);
  } else {
    // Fallback web: utiliser AsyncStorage
    await AsyncStorage.setItem(key, value);
  }
};

const secureGet = async (key: string): Promise<string | null> => {
  if (isNative) {
    return await SecureStore.getItemAsync(key);
  } else {
    // Fallback web: utiliser AsyncStorage
    return await AsyncStorage.getItem(key);
  }
};

const secureDelete = async (key: string): Promise<void> => {
  if (isNative) {
    await SecureStore.deleteItemAsync(key);
  } else {
    // Fallback web: utiliser AsyncStorage
    await AsyncStorage.removeItem(key);
  }
};

// Migration automatique AsyncStorage → SecureStore (natif uniquement)
const migrateIfNeeded = async (key: string): Promise<void> => {
  if (!isNative) return;

  try {
    // Vérifier si déjà dans SecureStore
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue) return; // Déjà migré

    // Vérifier si dans AsyncStorage
    const asyncValue = await AsyncStorage.getItem(key);
    if (asyncValue) {
      // Migrer vers SecureStore
      await SecureStore.setItemAsync(key, asyncValue);
      // Supprimer de AsyncStorage
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error migrating ${key}:`, error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    // Migrer si nécessaire
    await migrateIfNeeded(TOKEN_KEY);
    return await secureGet(TOKEN_KEY);
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
    await secureSet(TOKEN_KEY, token);
  } catch (error) {
    console.error("Error setting token:", error);
    throw error;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await secureDelete(TOKEN_KEY);
  } catch (error) {
    console.error("Error removing token:", error);
    throw error;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    // Migrer si nécessaire
    await migrateIfNeeded(REFRESH_TOKEN_KEY);
    return await secureGet(REFRESH_TOKEN_KEY);
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
    await secureSet(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error("Error setting refresh token:", error);
    throw error;
  }
};

export const removeRefreshToken = async (): Promise<void> => {
  try {
    await secureDelete(REFRESH_TOKEN_KEY);
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
    // Supprimer les tokens de SecureStore (ou AsyncStorage sur web)
    await secureDelete(TOKEN_KEY);
    await secureDelete(REFRESH_TOKEN_KEY);
    // Supprimer l'utilisateur de AsyncStorage
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("Error clearing storage:", error);
    throw error;
  }
};
