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

  it("formats recent weeks/months without zero values", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-07T12:00:00.000Z"));

    const activities: UserActivity[] = [
      {
        type: "liked_track",
        date: "2026-04-08T12:00:00.000Z",
        trackTitle: "Track A",
        artist: "Artist A",
      },
      {
        type: "liked_track",
        date: "2025-05-12T12:00:00.000Z",
        trackTitle: "Track B",
        artist: "Artist B",
      },
    ];
    mockUseMyActivities.mockReturnValue({
      activities,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText, queryByText } = render(<ProfileRecentActivities />);
    expect(getByText("Il y a 4 sem.")).toBeTruthy();
    expect(getByText("Il y a 12 mois")).toBeTruthy();
    expect(queryByText("Il y a 0 mois")).toBeNull();
    expect(queryByText("Il y a 0 ans")).toBeNull();
    jest.useRealTimers();
  });

  it("uses unique keys when activities share the same type and date", () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const activities: UserActivity[] = [
      {
        type: "liked_track",
        date: "2026-05-07T12:00:00.000Z",
        trackTitle: "Track A",
        artist: "Artist A",
      },
      {
        type: "liked_track",
        date: "2026-05-07T12:00:00.000Z",
        trackTitle: "Track B",
        artist: "Artist B",
      },
    ];
    mockUseMyActivities.mockReturnValue({
      activities,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<ProfileRecentActivities />);
    expect(
      consoleErrorSpy.mock.calls.some((call) =>
        String(call[0]).includes("Encountered two children with the same key"),
      ),
    ).toBe(false);
    consoleErrorSpy.mockRestore();
  });
});
