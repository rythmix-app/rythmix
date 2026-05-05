process.env.EXPO_PUBLIC_API_URL = "https://api.rythmix.test";

import { searchDeezerArtists, startParkeurSession } from "../parkeurService";
import { post } from "../api";
import { deezerAPI } from "../deezer-api";

jest.mock("../api", () => ({
  post: jest.fn(),
}));
jest.mock("../deezer-api", () => ({
  deezerAPI: { searchArtists: jest.fn() },
  DeezerArtist: undefined,
}));

const mockPost = post as jest.MockedFunction<typeof post>;
const mockSearchArtists = deezerAPI.searchArtists as jest.MockedFunction<
  typeof deezerAPI.searchArtists
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("startParkeurSession", () => {
  it("forwards the playlist input to the backend", async () => {
    mockPost.mockResolvedValueOnce({
      session: { id: "s1" },
      rounds: [],
    } as any);
    await startParkeurSession({ playlistId: 42 });
    expect(mockPost).toHaveBeenCalledWith("/api/games/parkeur/start", {
      playlistId: 42,
    });
  });

  it("forwards the artist input to the backend", async () => {
    mockPost.mockResolvedValueOnce({
      session: { id: "s2" },
      rounds: [],
    } as any);
    await startParkeurSession({ artistId: 27 });
    expect(mockPost).toHaveBeenCalledWith("/api/games/parkeur/start", {
      artistId: 27,
    });
  });
});

describe("searchDeezerArtists", () => {
  it("returns an empty array when the query is blank", async () => {
    const result = await searchDeezerArtists("   ");
    expect(result).toEqual([]);
    expect(mockSearchArtists).not.toHaveBeenCalled();
  });

  it("delegates to deezerAPI.searchArtists with the trimmed query", async () => {
    mockSearchArtists.mockResolvedValueOnce({
      data: [{ id: 27, name: "Stromae" } as any],
    });
    const result = await searchDeezerArtists("  Stromae  ", 5);
    expect(result).toEqual([{ id: 27, name: "Stromae" }]);
    expect(mockSearchArtists).toHaveBeenCalledWith("Stromae", 5);
  });

  it("returns an empty array when deezerAPI returns no data field", async () => {
    mockSearchArtists.mockResolvedValueOnce({} as any);
    const result = await searchDeezerArtists("X");
    expect(result).toEqual([]);
  });
});
