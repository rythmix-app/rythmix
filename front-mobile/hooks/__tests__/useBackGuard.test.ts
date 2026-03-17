import { renderHook, act } from "@testing-library/react-native";
import { router } from "expo-router";
import { useBackGuard } from "../useBackGuard";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => true),
    back: jest.fn(),
  },
}));

describe("useBackGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (router.canGoBack as jest.Mock).mockReturnValue(true);
  });

  describe("initial state", () => {
    it("should return onBack function and BackGuardModal", () => {
      const { result } = renderHook(() => useBackGuard({ enabled: true }));
      expect(typeof result.current.onBack).toBe("function");
      expect(result.current.BackGuardModal).toBeDefined();
    });
  });

  describe("when enabled=false", () => {
    it("should navigate directly on onBack without showing modal", () => {
      const { result } = renderHook(() => useBackGuard({ enabled: false }));

      act(() => {
        result.current.onBack();
      });

      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it("should not navigate when canGoBack returns false", () => {
      (router.canGoBack as jest.Mock).mockReturnValue(false);
      const { result } = renderHook(() => useBackGuard({ enabled: false }));

      act(() => {
        result.current.onBack();
      });

      expect(router.back).not.toHaveBeenCalled();
    });
  });

  describe("when enabled=true", () => {
    it("should not navigate immediately on onBack", () => {
      const { result } = renderHook(() => useBackGuard({ enabled: true }));

      act(() => {
        result.current.onBack();
      });

      expect(router.back).not.toHaveBeenCalled();
    });

    it("should not call onSave or onAbandon on direct back press", () => {
      const onSave = jest.fn();
      const onAbandon = jest.fn();
      const { result } = renderHook(() =>
        useBackGuard({ enabled: true, onSave, onAbandon }),
      );

      act(() => {
        result.current.onBack();
      });

      expect(onSave).not.toHaveBeenCalled();
      expect(onAbandon).not.toHaveBeenCalled();
      expect(router.back).not.toHaveBeenCalled();
    });
  });
});
