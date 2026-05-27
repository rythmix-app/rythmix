import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import OAuthCallbackScreen from "@/app/auth/oauth-callback";
import { router } from "expo-router";
import { getUserInfo } from "@/services/authService";
import { setRefreshToken, setToken, setUser } from "@/services/storage";
import { useAuthStore } from "@/stores/authStore";

let mockCurrentParams: Record<string, string | undefined> = {};
const mockShow = jest.fn();

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => mockCurrentParams,
}));

jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  parse: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/Toast", () => ({
  useToast: () => ({ show: mockShow }),
}));

jest.mock("@/services/authService", () => ({
  getUserInfo: jest.fn(),
}));

jest.mock("@/services/storage", () => ({
  setToken: jest.fn(),
  setRefreshToken: jest.fn(),
  setUser: jest.fn(),
}));

jest.mock("@/stores/authStore", () => {
  const setState = jest.fn();
  return {
    useAuthStore: Object.assign(() => ({}), { setState }),
  };
});

const mockReplace = router.replace as jest.MockedFunction<
  typeof router.replace
>;
const mockGetUserInfo = getUserInfo as jest.MockedFunction<typeof getUserInfo>;
const mockSetToken = setToken as jest.MockedFunction<typeof setToken>;
const mockSetRefreshToken = setRefreshToken as jest.MockedFunction<
  typeof setRefreshToken
>;
const mockSetUser = setUser as jest.MockedFunction<typeof setUser>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("OAuthCallbackScreen", () => {
  it("status=ok persists the tokens, fetches the user and redirects to (tabs)", async () => {
    mockCurrentParams = {
      status: "ok",
      provider: "google",
      accessToken: "AT",
      refreshToken: "RT",
    };
    mockGetUserInfo.mockResolvedValueOnce({
      id: "u-1",
      email: "u@example.com",
      username: "u",
      firstName: null,
      lastName: null,
      role: "user",
      emailVerifiedAt: "2026-01-01T00:00:00Z",
    });

    render(<OAuthCallbackScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)"));
    expect(mockSetToken).toHaveBeenCalledWith("AT");
    expect(mockSetRefreshToken).toHaveBeenCalledWith("RT");
    expect(mockSetUser).toHaveBeenCalled();
    expect(useAuthStore.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "AT",
        refreshToken: "RT",
        isAuthenticated: true,
      }),
    );
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("status=pending_confirmation redirects to oauth-pending-confirmation with provider and email", async () => {
    mockCurrentParams = {
      status: "pending_confirmation",
      provider: "spotify",
      email: "foo@bar.com",
    };

    render(<OAuthCallbackScreen />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/auth/oauth-pending-confirmation",
        params: { provider: "spotify", email: "foo@bar.com" },
      }),
    );
  });

  it("status=error shows a toast and redirects to /auth/login", async () => {
    mockCurrentParams = {
      status: "error",
      provider: "google",
      reason: "oauth_denied",
    };

    render(<OAuthCallbackScreen />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/auth/login"),
    );
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});
