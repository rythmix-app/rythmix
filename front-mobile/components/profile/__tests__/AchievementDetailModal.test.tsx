import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import AchievementDetailModal from "../AchievementDetailModal";
import { UserAchievementWithDetails } from "@/types/achievement";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const unlocked: UserAchievementWithDetails = {
  id: 1,
  name: "Première victoire",
  description: "Gagner sa toute première partie multijoueur",
  icon: "🥇",
  type: "FirstWin",
  currentProgress: 1,
  requiredProgress: 1,
  unlockedAt: "2026-05-13T12:00:00Z",
};

const locked: UserAchievementWithDetails = {
  id: 2,
  name: "Vétéran",
  description: "Jouer 10 parties",
  icon: "🏆",
  type: "GamesPlayed",
  currentProgress: 3,
  requiredProgress: 10,
  unlockedAt: null,
};

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-05-14T12:00:00Z"));
});

afterAll(() => {
  jest.useRealTimers();
});

describe("AchievementDetailModal", () => {
  it("returns null when no achievement is provided", () => {
    const { toJSON } = render(
      <AchievementDetailModal visible achievement={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders unlocked achievement with icon and relative date", () => {
    const { getByText } = render(
      <AchievementDetailModal
        visible
        achievement={unlocked}
        onClose={jest.fn()}
      />,
    );
    expect(getByText("🥇")).toBeTruthy();
    expect(getByText("Première victoire")).toBeTruthy();
    expect(getByText(/Débloqué/)).toBeTruthy();
    expect(getByText(/Hier/)).toBeTruthy();
  });

  it("renders locked achievement with progress text", () => {
    const { getByText } = render(
      <AchievementDetailModal
        visible
        achievement={locked}
        onClose={jest.fn()}
      />,
    );
    expect(getByText("🔒")).toBeTruthy();
    expect(getByText(/Verrouillé — 3\/10/)).toBeTruthy();
  });

  it("calls onClose when the Fermer button is pressed", () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <AchievementDetailModal
        visible
        achievement={unlocked}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByText("Fermer"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is pressed", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <AchievementDetailModal
        visible
        achievement={unlocked}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByTestId("achievement-modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
