import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  invalidateOnboardingStatus,
  setOnboardingStatusFromResponse,
  useOnboardingStatus,
} from "../useOnboardingStatus";
import { getMyOnboardingStatus } from "@/services/onboardingService";
import { useAuthStore } from "@/stores/authStore";

jest.mock("@/services/onboardingService", () => ({
  getMyOnboardingStatus: jest.fn(),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(),
}));

const mockGetStatus = getMyOnboardingStatus as jest.MockedFunction<
  typeof getMyOnboardingStatus
>;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

function setAuthenticated(value: boolean) {
  mockUseAuthStore.mockImplementation((selector?: (state: any) => any) => {
    const state = { isAuthenticated: value };
    return selector ? selector(state) : state;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  invalidateOnboardingStatus();
});

describe("useOnboardingStatus", () => {
  it("does not fetch when the user is not authenticated", async () => {
    setAuthenticated(false);

    renderHook(() => useOnboardingStatus());

    await waitFor(() => {
      expect(mockGetStatus).not.toHaveBeenCalled();
    });
  });

  it("fetches the status once when authenticated", async () => {
    setAuthenticated(true);
    mockGetStatus.mockResolvedValue({ completed: false, artistsCount: 1 });

    const { result } = renderHook(() => useOnboardingStatus());

    await waitFor(() => {
      expect(result.current.status).toEqual({
        completed: false,
        artistsCount: 1,
      });
    });
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
  });

  it("setOnboardingStatusFromResponse updates the cache without refetching", async () => {
    setAuthenticated(true);
    mockGetStatus.mockResolvedValue({ completed: false, artistsCount: 0 });

    const { result } = renderHook(() => useOnboardingStatus());

    await waitFor(() => {
      expect(result.current.status?.completed).toBe(false);
    });

    act(() => {
      setOnboardingStatusFromResponse({ completed: true, artistsCount: 4 });
    });

    expect(result.current.status).toEqual({
      completed: true,
      artistsCount: 4,
    });
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
  });

  it("clears the cache when the user logs out", async () => {
    setAuthenticated(true);
    mockGetStatus.mockResolvedValue({ completed: true, artistsCount: 5 });

    const { result, rerender } = renderHook(() => useOnboardingStatus());

    await waitFor(() => {
      expect(result.current.status?.completed).toBe(true);
    });

    setAuthenticated(false);
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.status).toBeNull();
    });
  });
});
