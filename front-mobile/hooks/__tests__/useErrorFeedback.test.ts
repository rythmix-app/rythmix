import { renderHook, act } from "@testing-library/react-native";
import { useErrorFeedback } from "../useErrorFeedback";

describe("useErrorFeedback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("initial state", () => {
    it("should initialize with null errorMessage", () => {
      const { result } = renderHook(() => useErrorFeedback());
      expect(result.current.errorMessage).toBeNull();
    });

    it("should return shakeAnimation and borderOpacity animated values", () => {
      const { result } = renderHook(() => useErrorFeedback());
      expect(result.current.shakeAnimation).toBeDefined();
      expect(result.current.borderOpacity).toBeDefined();
    });

    it("should return a triggerError function", () => {
      const { result } = renderHook(() => useErrorFeedback());
      expect(typeof result.current.triggerError).toBe("function");
    });
  });

  describe("triggerError", () => {
    it("should set errorMessage when called with a message", () => {
      const { result } = renderHook(() => useErrorFeedback());

      act(() => {
        result.current.triggerError("Ce n'est pas la bonne réponse !");
      });

      expect(result.current.errorMessage).toBe(
        "Ce n'est pas la bonne réponse !",
      );
    });

    it("should not set errorMessage when called without message", () => {
      const { result } = renderHook(() => useErrorFeedback());

      act(() => {
        result.current.triggerError();
      });

      expect(result.current.errorMessage).toBeNull();
    });

    it("should not set errorMessage when called with undefined", () => {
      const { result } = renderHook(() => useErrorFeedback());

      act(() => {
        result.current.triggerError(undefined);
      });

      expect(result.current.errorMessage).toBeNull();
    });

    it("should auto-clear errorMessage after 1500ms", () => {
      const { result } = renderHook(() => useErrorFeedback());

      act(() => {
        result.current.triggerError("Erreur de jeu");
      });

      expect(result.current.errorMessage).toBe("Erreur de jeu");

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(result.current.errorMessage).toBeNull();
    });

    it("should not clear errorMessage before 1500ms", () => {
      const { result } = renderHook(() => useErrorFeedback());

      act(() => {
        result.current.triggerError("Erreur persistante");
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.errorMessage).toBe("Erreur persistante");
    });

    it("should reset the clear timer when triggerError is called again", () => {
      const { result } = renderHook(() => useErrorFeedback());

      act(() => {
        result.current.triggerError("Première erreur");
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      act(() => {
        result.current.triggerError("Deuxième erreur");
      });

      expect(result.current.errorMessage).toBe("Deuxième erreur");

      // Advance 1500ms from the second trigger
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(result.current.errorMessage).toBeNull();
    });

    it("should trigger animations when called", () => {
      const { result } = renderHook(() => useErrorFeedback());
      const { shakeAnimation, borderOpacity } = result.current;

      const shakeSetValue = jest.spyOn(shakeAnimation, "setValue");
      const borderSetValue = jest.spyOn(borderOpacity, "setValue");

      act(() => {
        result.current.triggerError("Animation test");
      });

      expect(shakeSetValue).toHaveBeenCalledWith(0);
      expect(borderSetValue).toHaveBeenCalledWith(0);
    });
  });
});
