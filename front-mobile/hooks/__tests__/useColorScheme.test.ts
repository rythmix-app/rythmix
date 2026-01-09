import { renderHook } from "@testing-library/react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useColorScheme as useRNColorScheme } from "react-native";

// Mock react-native's useColorScheme
jest.mock("react-native", () => ({
  useColorScheme: jest.fn(),
}));

describe("useColorScheme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return light mode when react-native returns light", () => {
    (useRNColorScheme as jest.Mock).mockReturnValue("light");

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe("light");
  });

  it("should return dark mode when react-native returns dark", () => {
    (useRNColorScheme as jest.Mock).mockReturnValue("dark");

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe("dark");
  });

  it("should return null when react-native returns null", () => {
    (useRNColorScheme as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBeNull();
  });

  it("should update when color scheme changes", () => {
    (useRNColorScheme as jest.Mock).mockReturnValue("light");

    const { result, rerender } = renderHook(() => useColorScheme());

    expect(result.current).toBe("light");

    // Simulate color scheme change
    (useRNColorScheme as jest.Mock).mockReturnValue("dark");
    rerender({});

    expect(result.current).toBe("dark");
  });
});
