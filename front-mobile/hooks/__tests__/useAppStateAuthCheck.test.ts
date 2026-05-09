import { renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";

const mockCheckAuth = jest.fn();
const mockGetState = jest.fn();

jest.mock("@/stores/authStore", () => {
  const useAuthStore = (selector: (state: unknown) => unknown) =>
    selector({ checkAuth: mockCheckAuth });
  (useAuthStore as unknown as { getState: () => unknown }).getState = () =>
    mockGetState();
  return { useAuthStore };
});

import { useAppStateAuthCheck } from "../useAppStateAuthCheck";

describe("useAppStateAuthCheck", () => {
  let listener: ((state: string) => void) | null = null;
  let removeMock: jest.Mock;

  beforeEach(() => {
    listener = null;
    removeMock = jest.fn();
    mockCheckAuth.mockClear();
    mockGetState.mockClear();

    jest.spyOn(AppState, "addEventListener").mockImplementation(((
      event: string,
      cb: (state: string) => void,
    ) => {
      if (event === "change") listener = cb;
      return { remove: removeMock } as { remove: () => void };
    }) as typeof AppState.addEventListener);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("re-validates auth when app returns to foreground while authenticated", () => {
    mockGetState.mockReturnValue({ isAuthenticated: true });

    renderHook(() => useAppStateAuthCheck());
    expect(listener).toBeTruthy();

    listener!("background");
    listener!("active");

    expect(mockCheckAuth).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the user is not authenticated", () => {
    mockGetState.mockReturnValue({ isAuthenticated: false });

    renderHook(() => useAppStateAuthCheck());

    listener!("background");
    listener!("active");

    expect(mockCheckAuth).not.toHaveBeenCalled();
  });

  it("removes the AppState listener on unmount", () => {
    mockGetState.mockReturnValue({ isAuthenticated: true });

    const { unmount } = renderHook(() => useAppStateAuthCheck());
    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});
