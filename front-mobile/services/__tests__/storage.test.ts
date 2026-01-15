import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { User } from "@/types/auth";
import * as storage from "../storage";

// Mock des dépendances
jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-secure-store");
jest.mock("react-native/Libraries/Utilities/Platform", () => ({
  OS: "ios", // Tester en mode natif par défaut
  select: jest.fn((obj: any) => obj.ios || obj.default),
}));

describe("storage service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Token management", () => {
    describe("getToken", () => {
      it("should return token from secure storage", async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
          "test_token"
        );

        const token = await storage.getToken();

        expect(token).toBe("test_token");
      });

      it("should return null if no token exists", async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

        const token = await storage.getToken();

        expect(token).toBeNull();
      });

      it("should migrate from AsyncStorage to SecureStore if needed", async () => {
        // Premier appel: pas dans SecureStore
        // Deuxième appel: trouvé dans SecureStore après migration
        (SecureStore.getItemAsync as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce("migrated_token");
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
          "migrated_token"
        );

        const token = await storage.getToken();

        expect(token).toBe("migrated_token");
        // Vérifier que la migration a eu lieu
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          "@rythmix_token",
          "migrated_token"
        );
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@rythmix_token");
      });

      it("should return null on error", async () => {
        (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
          new Error("Storage error")
        );

        const token = await storage.getToken();

        expect(token).toBeNull();
      });
    });

    describe("setToken", () => {
      it("should save token to secure storage", async () => {
        await storage.setToken("new_token");

        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          "@rythmix_token",
          "new_token"
        );
      });

      it("should throw error if token is empty", async () => {
        await expect(storage.setToken("")).rejects.toThrow(
          "Token cannot be empty"
        );
      });

      it("should throw error if token is only whitespace", async () => {
        await expect(storage.setToken("   ")).rejects.toThrow(
          "Token cannot be empty"
        );
      });

      it("should propagate storage errors", async () => {
        (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
          new Error("Storage full")
        );

        await expect(storage.setToken("token")).rejects.toThrow(
          "Storage full"
        );
      });
    });

    describe("removeToken", () => {
      it("should delete token from secure storage", async () => {
        await storage.removeToken();

        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
          "@rythmix_token"
        );
      });

      it("should propagate storage errors", async () => {
        (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
          new Error("Delete failed")
        );

        await expect(storage.removeToken()).rejects.toThrow("Delete failed");
      });
    });
  });

  describe("Refresh token management", () => {
    describe("getRefreshToken", () => {
      it("should return refresh token from secure storage", async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
          "refresh_token"
        );

        const token = await storage.getRefreshToken();

        expect(token).toBe("refresh_token");
      });

      it("should return null if no refresh token exists", async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

        const token = await storage.getRefreshToken();

        expect(token).toBeNull();
      });

      it("should migrate refresh token from AsyncStorage", async () => {
        jest.clearAllMocks();
        (SecureStore.getItemAsync as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce("migrated_refresh");
        (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
          "migrated_refresh"
        );
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

        const token = await storage.getRefreshToken();

        expect(token).toBe("migrated_refresh");
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          "@rythmix_refresh_token",
          "migrated_refresh"
        );
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
          "@rythmix_refresh_token"
        );
      });

      it("should return null on error", async () => {
        (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
          new Error("Storage error")
        );

        const token = await storage.getRefreshToken();

        expect(token).toBeNull();
      });
    });

    describe("setRefreshToken", () => {
      it("should save refresh token to secure storage", async () => {
        jest.clearAllMocks();
        (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

        await storage.setRefreshToken("new_refresh_token");

        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          "@rythmix_refresh_token",
          "new_refresh_token"
        );
      });

      it("should throw error if refresh token is empty", async () => {
        await expect(storage.setRefreshToken("")).rejects.toThrow(
          "Refresh token cannot be empty"
        );
      });

      it("should propagate storage errors", async () => {
        (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
          new Error("Storage full")
        );

        await expect(storage.setRefreshToken("token")).rejects.toThrow(
          "Storage full"
        );
      });
    });

    describe("removeRefreshToken", () => {
      it("should delete refresh token from secure storage", async () => {
        jest.clearAllMocks();
        (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

        await storage.removeRefreshToken();

        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
          "@rythmix_refresh_token"
        );
      });
    });
  });

  describe("User management", () => {
    const mockUser: User = {
      id: "123",
      email: "test@example.com",
      username: "testuser",
      firstName: "Test",
      lastName: "User",
      role: "user",
      emailVerifiedAt: "2024-01-01T00:00:00.000Z",
    };

    describe("getUser", () => {
      it("should return user from AsyncStorage", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
          JSON.stringify(mockUser)
        );

        const user = await storage.getUser();

        expect(user).toEqual(mockUser);
        expect(AsyncStorage.getItem).toHaveBeenCalledWith("@rythmix_user");
      });

      it("should return null if no user exists", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        const user = await storage.getUser();

        expect(user).toBeNull();
      });

      it("should return null on JSON parse error", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue("invalid json");

        const user = await storage.getUser();

        expect(user).toBeNull();
      });

      it("should return null on storage error", async () => {
        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
          new Error("Storage error")
        );

        const user = await storage.getUser();

        expect(user).toBeNull();
      });
    });

    describe("setUser", () => {
      it("should save user to AsyncStorage", async () => {
        await storage.setUser(mockUser);

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          "@rythmix_user",
          JSON.stringify(mockUser)
        );
      });

      it("should throw error if user is invalid (no id)", async () => {
        await expect(storage.setUser({} as User)).rejects.toThrow(
          "User object is invalid"
        );
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      });

      it("should throw error if user is null", async () => {
        await expect(storage.setUser(null as any)).rejects.toThrow(
          "User object is invalid"
        );
      });

      it("should propagate storage errors", async () => {
        (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
          new Error("Storage full")
        );

        await expect(storage.setUser(mockUser)).rejects.toThrow(
          "Storage full"
        );
      });
    });
  });

  describe("clearAll", () => {
    it("should delete all tokens and user", async () => {
      jest.clearAllMocks();
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await storage.clearAll();

      // Vérifie que les tokens sont supprimés de SecureStore
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "@rythmix_token"
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "@rythmix_refresh_token"
      );
      // Vérifie que l'utilisateur est supprimé de AsyncStorage
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@rythmix_user");
    });

    it("should propagate errors", async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error("Delete failed")
      );

      await expect(storage.clearAll()).rejects.toThrow("Delete failed");
    });
  });
});
