process.env.EXPO_PUBLIC_API_URL = "https://api.rythmix.test";

import {
  getMyOnboardingArtists,
  getMyOnboardingStatus,
  getOnboardingArtistSuggestions,
  getOnboardingSpotifySuggestions,
  setMyOnboardingArtists,
} from "../onboardingService";
import { get, post } from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;
const mockPost = post as jest.MockedFunction<typeof post>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("onboardingService", () => {
  it("getMyOnboardingStatus GETs /api/me/onboarding/status", async () => {
    mockGet.mockResolvedValueOnce({ completed: true, artistsCount: 4 });

    const status = await getMyOnboardingStatus();

    expect(mockGet).toHaveBeenCalledWith("/api/me/onboarding/status");
    expect(status).toEqual({ completed: true, artistsCount: 4 });
  });

  it("getMyOnboardingArtists unwraps the artists array", async () => {
    const artists = [
      {
        id: 1,
        userId: "u",
        deezerArtistId: "27",
        artistName: "Daft Punk",
        rank: 1,
      },
    ];
    mockGet.mockResolvedValueOnce({ artists });

    const result = await getMyOnboardingArtists();

    expect(mockGet).toHaveBeenCalledWith("/api/me/onboarding/artists");
    expect(result).toEqual(artists);
  });

  it("setMyOnboardingArtists POSTs the deezer ids and returns the artists", async () => {
    const artists = [
      {
        id: 1,
        userId: "u",
        deezerArtistId: "27",
        artistName: "Daft Punk",
        rank: 1,
      },
      {
        id: 2,
        userId: "u",
        deezerArtistId: "413",
        artistName: "Stromae",
        rank: 2,
      },
      {
        id: 3,
        userId: "u",
        deezerArtistId: "288166",
        artistName: "Angèle",
        rank: 3,
      },
    ];
    mockPost.mockResolvedValueOnce({ artists });

    const result = await setMyOnboardingArtists([27, 413, 288166]);

    expect(mockPost).toHaveBeenCalledWith("/api/me/onboarding/artists", {
      deezerArtistIds: [27, 413, 288166],
    });
    expect(result).toEqual(artists);
  });

  it("getOnboardingArtistSuggestions appends country and limit query params", async () => {
    mockGet.mockResolvedValueOnce({ artists: [] });

    await getOnboardingArtistSuggestions({ country: "FR", limit: 24 });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/me/onboarding/artists/suggestions?country=FR&limit=24",
    );
  });

  it("getOnboardingArtistSuggestions calls the endpoint without query string when no options", async () => {
    mockGet.mockResolvedValueOnce({ artists: [] });

    await getOnboardingArtistSuggestions();

    expect(mockGet).toHaveBeenCalledWith(
      "/api/me/onboarding/artists/suggestions",
    );
  });

  it("getOnboardingSpotifySuggestions GETs the spotify-suggestions endpoint", async () => {
    const artists = [{ id: 27, name: "Daft Punk", picture_medium: "img" }];
    mockGet.mockResolvedValueOnce({ artists });

    const result = await getOnboardingSpotifySuggestions();

    expect(mockGet).toHaveBeenCalledWith(
      "/api/me/onboarding/artists/spotify-suggestions",
    );
    expect(result).toEqual(artists);
  });
});
