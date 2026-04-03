import React from "react";
import { TouchableOpacity } from "react-native";
import {
  render,
  fireEvent,
  renderHook,
  act,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { useBackGuard } from "../useBackGuard";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => true),
    back: jest.fn(),
  },
}));

function BackGuardWrapper({
  enabled,
  onSave,
}: {
  enabled: boolean;
  onSave?: () => void;
}) {
  const { onBack, backGuardModal } = useBackGuard({
    enabled,
    onSave,
  });
  return (
    <>
      <TouchableOpacity testID="back-button" onPress={onBack} />
      {backGuardModal}
    </>
  );
}

describe("useBackGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (router.canGoBack as jest.Mock).mockReturnValue(true);
  });

  describe("initial state", () => {
    it("should return onBack function and backGuardModal", () => {
      const { result } = renderHook(() => useBackGuard({ enabled: true }));
      expect(typeof result.current.onBack).toBe("function");
      expect(result.current.backGuardModal).toBeDefined();
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

    it("should show modal when onBack is pressed", () => {
      const { getByTestId, getByText } = render(
        <BackGuardWrapper enabled={true} />,
      );
      fireEvent.press(getByTestId("back-button"));
      expect(getByText("Quitter la partie ?")).toBeTruthy();
    });

    it("should call onSave and navigate when pressing Sauvegarder", () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <BackGuardWrapper enabled={true} onSave={onSave} />,
      );
      fireEvent.press(getByTestId("back-button"));
      fireEvent.press(getByText("Sauvegarder"));
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it("should navigate when pressing Sauvegarder without onSave", () => {
      const { getByTestId, getByText } = render(
        <BackGuardWrapper enabled={true} />,
      );
      fireEvent.press(getByTestId("back-button"));
      fireEvent.press(getByText("Sauvegarder"));
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it("should not navigate when pressing Annuler", () => {
      const { getByTestId, getByText } = render(
        <BackGuardWrapper enabled={true} />,
      );
      fireEvent.press(getByTestId("back-button"));
      fireEvent.press(getByText("Annuler"));
      expect(router.back).not.toHaveBeenCalled();
      // The modal should be closed (or at least hidden)
      // Note: testing visibility might be tricky depending on how Modal is mocked
    });
  });
});
