import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import ProfileAchievementsSection from "../ProfileAchievementsSection";
import { useMyAchievements } from "@/hooks/useMyAchievements";
import { UserAchievementWithDetails } from "@/types/achievement";

jest.mock("@/hooks/useMyAchievements", () => ({
  useMyAchievements: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUseMyAchievements = useMyAchievements as jest.MockedFunction<
  typeof useMyAchievements
>;

const unlocked: UserAchievementWithDetails = {
  id: 1,
  name: "Première victoire",
  description: "Gagner sa toute première partie",
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProfileAchievementsSection", () => {
  it("renders the section title", () => {
    mockUseMyAchievements.mockReturnValue({
      achievements: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByText } = render(<ProfileAchievementsSection />);
    expect(getByText("Succès & Récompenses")).toBeTruthy();
  });

  it("renders empty state when no achievements", () => {
    mockUseMyAchievements.mockReturnValue({
      achievements: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByText } = render(<ProfileAchievementsSection />);
    expect(getByText(/Aucun succès disponible/i)).toBeTruthy();
  });

  it("renders error feedback when the hook reports an error", () => {
    mockUseMyAchievements.mockReturnValue({
      achievements: [],
      isLoading: false,
      error: "network",
      refresh: jest.fn(),
    });
    const { getByText } = render(<ProfileAchievementsSection />);
    expect(getByText(/Impossible de charger tes succès/i)).toBeTruthy();
  });

  it("renders unlocked and locked cards with the right icons", () => {
    mockUseMyAchievements.mockReturnValue({
      achievements: [unlocked, locked],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByText } = render(<ProfileAchievementsSection />);
    expect(getByText("🥇")).toBeTruthy();
    expect(getByText("🔒")).toBeTruthy();
    expect(getByText("Première victoire")).toBeTruthy();
    expect(getByText("Vétéran")).toBeTruthy();
  });

  it("opens the detail modal when a card is pressed", () => {
    mockUseMyAchievements.mockReturnValue({
      achievements: [unlocked, locked],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { getByLabelText, queryByText, getByText } = render(
      <ProfileAchievementsSection />,
    );

    expect(queryByText(/Verrouillé/)).toBeNull();
    fireEvent.press(getByLabelText("Vétéran, verrouillé"));
    expect(getByText(/Verrouillé — 3\/10/)).toBeTruthy();
  });
});
