import { renderHook } from "@testing-library/react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import * as useColorSchemeModule from "@/hooks/useColorScheme";

// Mock useColorScheme
jest.mock("../useColorScheme", () => ({
  useColorScheme: jest.fn(),
}));

// Mock Colors constants
jest.mock("@/constants/Colors", () => ({
  Colors: {
    light: {
      text: "#11181C",
      background: "#fff",
      tint: "#0a7ea4",
      icon: "#687076",
      tabIconDefault: "#687076",
      tabIconSelected: "#0a7ea4",
    },
    dark: {
      text: "#ECEDEE",
      background: "#151718",
      tint: "#fff",
      icon: "#9BA1A6",
      tabIconDefault: "#9BA1A6",
      tabIconSelected: "#fff",
    },
  },
}));

describe("useThemeColor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("light theme", () => {
    beforeEach(() => {
      (useColorSchemeModule.useColorScheme as jest.Mock).mockReturnValue(
        "light",
      );
    });

    it("should return light color from props when provided", () => {
      const { result } = renderHook(() =>
        useThemeColor({ light: "#custom-light", dark: "#custom-dark" }, "text"),
      );

      expect(result.current).toBe("#custom-light");
    });

    it("should return color from Colors.light when no props provided", () => {
      const { result } = renderHook(() => useThemeColor({}, "text"));

      expect(result.current).toBe("#11181C");
    });

    it("should return background color from Colors.light", () => {
      const { result } = renderHook(() => useThemeColor({}, "background"));

      expect(result.current).toBe("#fff");
    });

    it("should return tint color from Colors.light", () => {
      const { result } = renderHook(() => useThemeColor({}, "tint"));

      expect(result.current).toBe("#0a7ea4");
    });

    it("should prefer light prop over Colors constant", () => {
      const { result } = renderHook(() =>
        useThemeColor({ light: "#override" }, "text"),
      );

      expect(result.current).toBe("#override");
    });
  });

  describe("dark theme", () => {
    beforeEach(() => {
      (useColorSchemeModule.useColorScheme as jest.Mock).mockReturnValue(
        "dark",
      );
    });

    it("should return dark color from props when provided", () => {
      const { result } = renderHook(() =>
        useThemeColor({ light: "#custom-light", dark: "#custom-dark" }, "text"),
      );

      expect(result.current).toBe("#custom-dark");
    });

    it("should return color from Colors.dark when no props provided", () => {
      const { result } = renderHook(() => useThemeColor({}, "text"));

      expect(result.current).toBe("#ECEDEE");
    });

    it("should return background color from Colors.dark", () => {
      const { result } = renderHook(() => useThemeColor({}, "background"));

      expect(result.current).toBe("#151718");
    });

    it("should return tint color from Colors.dark", () => {
      const { result } = renderHook(() => useThemeColor({}, "tint"));

      expect(result.current).toBe("#fff");
    });

    it("should prefer dark prop over Colors constant", () => {
      const { result } = renderHook(() =>
        useThemeColor({ dark: "#override" }, "text"),
      );

      expect(result.current).toBe("#override");
    });
  });

  describe("null theme (defaults to light)", () => {
    beforeEach(() => {
      (useColorSchemeModule.useColorScheme as jest.Mock).mockReturnValue(null);
    });

    it("should default to light theme when colorScheme is null", () => {
      const { result } = renderHook(() => useThemeColor({}, "text"));

      // When theme is null, it defaults to 'light' via the ?? operator
      expect(result.current).toBe("#11181C");
    });

    it("should use light prop when theme is null and light prop is provided", () => {
      const { result } = renderHook(() =>
        useThemeColor({ light: "#custom-light", dark: "#custom-dark" }, "text"),
      );

      expect(result.current).toBe("#custom-light");
    });
  });

  describe("theme changes", () => {
    it("should update color when theme changes from light to dark", () => {
      (useColorSchemeModule.useColorScheme as jest.Mock).mockReturnValue(
        "light",
      );

      const { result, rerender } = renderHook(() => useThemeColor({}, "text"));

      expect(result.current).toBe("#11181C");

      // Change to dark theme
      (useColorSchemeModule.useColorScheme as jest.Mock).mockReturnValue(
        "dark",
      );
      rerender({});

      expect(result.current).toBe("#ECEDEE");
    });

    it("should update color when theme changes from dark to light", () => {
      (useColorSchemeModule.useColorScheme as jest.Mock).mockReturnValue(
        "dark",
      );

      const { result, rerender } = renderHook(() =>
        useThemeColor({}, "background"),
      );

      expect(result.current).toBe("#151718");

      // Change to light theme
      (useColorSchemeModule.useColorScheme as jest.Mock).mockReturnValue(
        "light",
      );
      rerender({});

      expect(result.current).toBe("#fff");
    });
  });

  describe("all color names", () => {
    beforeEach(() => {
      (useColorSchemeModule.useColorScheme as jest.Mock).mockReturnValue(
        "light",
      );
    });

    it("should handle icon color", () => {
      const { result } = renderHook(() => useThemeColor({}, "icon"));

      expect(result.current).toBe("#687076");
    });

    it("should handle tabIconDefault color", () => {
      const { result } = renderHook(() => useThemeColor({}, "tabIconDefault"));

      expect(result.current).toBe("#687076");
    });

    it("should handle tabIconSelected color", () => {
      const { result } = renderHook(() => useThemeColor({}, "tabIconSelected"));

      expect(result.current).toBe("#0a7ea4");
    });
  });
});
