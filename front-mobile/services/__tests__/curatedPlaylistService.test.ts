process.env.EXPO_PUBLIC_API_URL = "https://api.rythmix.test";

import {
  getCuratedPlaylists,
  getCuratedPlaylistTracks,
  CuratedPlaylist,
  CuratedPlaylistTrack,
} from "../curatedPlaylistService";
import { get } from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;

const samplePlaylist: CuratedPlaylist = {
  id: 1,
  deezerPlaylistId: 1996494362,
  name: "Top France",
  genreLabel: "Hits FR",
  coverUrl: "https://cover.example/fr.jpg",
  trackCount: 1500,
  createdAt: "2026-04-29T10:00:00.000Z",
  updatedAt: "2026-04-29T10:00:00.000Z",
};

const sampleTrack: CuratedPlaylistTrack = {
  id: 12345,
  title: "Track",
  title_short: "Track",
  preview: "https://preview/12345.mp3",
  duration: 30,
  artist: { id: 1, name: "Artist" },
  album: { id: 2, title: "Album" },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("curatedPlaylistService", () => {
  it("getCuratedPlaylists hits /api/games/blindtest/playlists and unwraps the playlists field", async () => {
    mockGet.mockResolvedValueOnce({ playlists: [samplePlaylist] });

    const result = await getCuratedPlaylists();

    expect(mockGet).toHaveBeenCalledWith("/api/games/blindtest/playlists");
    expect(result).toEqual([samplePlaylist]);
  });

  it("getCuratedPlaylistTracks hits the tracks endpoint with default count=50", async () => {
    mockGet.mockResolvedValueOnce({ tracks: [sampleTrack] });

    const result = await getCuratedPlaylistTracks(7);

    expect(mockGet).toHaveBeenCalledWith(
      "/api/games/blindtest/playlists/7/tracks?count=50",
    );
    expect(result).toEqual([sampleTrack]);
  });

  it("getCuratedPlaylistTracks forwards a custom count", async () => {
    mockGet.mockResolvedValueOnce({ tracks: [] });

    await getCuratedPlaylistTracks(42, 5);

    expect(mockGet).toHaveBeenCalledWith(
      "/api/games/blindtest/playlists/42/tracks?count=5",
    );
  });
});
