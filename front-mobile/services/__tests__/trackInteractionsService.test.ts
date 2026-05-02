process.env.EXPO_PUBLIC_API_URL = "https://api.rythmix.test";

import {
  deleteMyTrackInteraction,
  getMyTrackInteractions,
  upsertMyTrackInteraction,
} from "../trackInteractionsService";
import { del, get, post } from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
  del: jest.fn(),
  post: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;
const mockDel = del as jest.MockedFunction<typeof del>;
const mockPost = post as jest.MockedFunction<typeof post>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("trackInteractionsService", () => {
  it("upsertMyTrackInteraction POSTs to /api/me/swipemix/interactions and returns the interaction", async () => {
    const interaction = {
      id: 1,
      userId: "u1",
      deezerTrackId: "42",
      deezerArtistId: "7",
      action: "liked" as const,
      title: "t",
      artist: "a",
      isrc: null,
    };
    mockPost.mockResolvedValueOnce({ interaction });

    const request = {
      deezerTrackId: "42",
      deezerArtistId: "7",
      action: "liked" as const,
      title: "t",
      artist: "a",
    };
    const result = await upsertMyTrackInteraction(request);

    expect(mockPost).toHaveBeenCalledWith(
      "/api/me/swipemix/interactions",
      request,
    );
    expect(result).toEqual({ interaction });
  });

  it("upsertMyTrackInteraction surfaces the spotifyResult when present", async () => {
    const interaction = {
      id: 2,
      userId: "u1",
      deezerTrackId: "99",
      deezerArtistId: null,
      action: "liked" as const,
      title: "x",
      artist: "y",
      isrc: null,
    };
    mockPost.mockResolvedValueOnce({
      interaction,
      spotifyResult: { triggered: true, notOnSpotify: true },
    });

    const result = await upsertMyTrackInteraction({
      deezerTrackId: "99",
      action: "liked",
    });
    expect(result.spotifyResult).toEqual({
      triggered: true,
      notOnSpotify: true,
    });
  });

  it("deleteMyTrackInteraction DELETEs /api/me/swipemix/interactions/:id", async () => {
    mockDel.mockResolvedValueOnce(undefined);
    await deleteMyTrackInteraction("42");
    expect(mockDel).toHaveBeenCalledWith("/api/me/swipemix/interactions/42");
  });

  it("getMyTrackInteractions GETs without query when action is omitted", async () => {
    mockGet.mockResolvedValueOnce({ interactions: [] });
    const result = await getMyTrackInteractions();
    expect(mockGet).toHaveBeenCalledWith("/api/me/swipemix/interactions");
    expect(result).toEqual([]);
  });

  it("getMyTrackInteractions forwards the action filter", async () => {
    mockGet.mockResolvedValueOnce({ interactions: [] });
    await getMyTrackInteractions("disliked");
    expect(mockGet).toHaveBeenCalledWith(
      "/api/me/swipemix/interactions?action=disliked",
    );
  });
});
