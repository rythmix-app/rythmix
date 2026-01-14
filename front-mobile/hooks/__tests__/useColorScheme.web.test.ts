import { renderHook, waitFor } from "@testing-library/react-native";
import { useColorScheme } from "@/hooks/useColorScheme.web";
import { useColorScheme as useRNColorScheme } from "react-native";

// Mock react-native's useColorScheme
jest.mock("react-native", () => ({
  useColorScheme: jest.fn(),
}));

describe("useColorScheme.web", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Note: Testing the "before hydration" SSR state requires a server-side rendering environment
  // In this client-side test environment, useEffect runs synchronously, so the hook hydrates immediately

  it("should return actual color scheme after hydration", async () => {
    (useRNColorScheme as jest.Mock).mockReturnValue("dark");

    const { result } = renderHook(() => useColorScheme());

    // In the test environment, hydration happens immediately
    await waitFor(() => {
      expect(result.current).toBe("dark");
    });
  });

  it("should handle light color scheme after hydration", async () => {
    (useRNColorScheme as jest.Mock).mockReturnValue("light");

    const { result } = renderHook(() => useColorScheme());

    await waitFor(() => {
      expect(result.current).toBe("light");
    });
  });

  it("should handle null color scheme after hydration", async () => {
    (useRNColorScheme as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useColorScheme());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it("should update when color scheme changes after hydration", async () => {
    (useRNColorScheme as jest.Mock).mockReturnValue("light");

    const { result, rerender } = renderHook(() => useColorScheme());

    // Wait for hydration
    await waitFor(() => {
      expect(result.current).toBe("light");
    });

    // Simulate color scheme change
    (useRNColorScheme as jest.Mock).mockReturnValue("dark");
    rerender({});

    await waitFor(() => {
      expect(result.current).toBe("dark");
    });
  });

  it("should maintain hydration state across re-renders", async () => {
    (useRNColorScheme as jest.Mock).mockReturnValue("dark");

    const { result, rerender } = renderHook(() => useColorScheme());

    // Wait for initial hydration
    await waitFor(() => {
      expect(result.current).toBe("dark");
    });

    // Re-render should not reset hydration
    rerender({});

    expect(result.current).toBe("dark");
  });
});
