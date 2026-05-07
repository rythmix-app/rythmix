import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { ProfileRecentActivities } from "../ProfileRecentActivities";
import { useMyActivities } from "@/hooks/useMyActivities";
import { UserActivity } from "@/types/userActivity";

jest.mock("@/hooks/useMyActivities", () => ({
  useMyActivities: jest.fn(),
}));

const mockUseMyActivities = useMyActivities as jest.MockedFunction<
  typeof useMyActivities
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProfileRecentActivities", () => {
  it("renders the empty state when there are no activities", async () => {
    mockUseMyActivities.mockReturnValue({
      activities: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<ProfileRecentActivities />);
    await waitFor(() =>
      expect(getByText(/Tu n'as pas encore d'activité/i)).toBeTruthy(),
    );
  });

  it("renders a game_session activity with score and game title", async () => {
    const activities: UserActivity[] = [
      {
        type: "game_session",
        date: new Date().toISOString(),
        gameTitle: "Blurchette",
        score: 8,
        maxScore: 10,
      },
    ];
    mockUseMyActivities.mockReturnValue({
      activities,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<ProfileRecentActivities />);
    expect(getByText("Partie Blurchette")).toBeTruthy();
    expect(getByText("Score : 8/10")).toBeTruthy();
  });

  it("renders an error message when the hook reports an error", async () => {
    mockUseMyActivities.mockReturnValue({
      activities: [],
      isLoading: false,
      error: "network",
      refresh: jest.fn(),
    });

    const { getByText } = render(<ProfileRecentActivities />);
    expect(getByText(/Impossible de charger tes activités/i)).toBeTruthy();
  });

  it("renders a liked_track activity with track title and artist", async () => {
    const activities: UserActivity[] = [
      {
        type: "liked_track",
        date: new Date().toISOString(),
        trackTitle: "Papaoutai",
        artist: "Stromae",
      },
    ];
    mockUseMyActivities.mockReturnValue({
      activities,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<ProfileRecentActivities />);
    expect(getByText("Titre mis en favori")).toBeTruthy();
    expect(getByText("Papaoutai - Stromae")).toBeTruthy();
  });
});
