import { getSwipemixFeed } from "../swipemixFeedService";
import { get } from "../api";
import { DeezerTrack } from "../deezer-api";

jest.mock("../api", () => ({
  get: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("swipemixFeedService", () => {
  const mockTrack = {
    id: 1,
    title: "Track 1",
  } as unknown as DeezerTrack;

  it("GETs /api/me/swipemix/feed with limit and offset", async () => {
    mockGet.mockResolvedValueOnce({ tracks: [mockTrack] });

    const result = await getSwipemixFeed(20, 10);

    expect(mockGet).toHaveBeenCalledWith(
      "/api/me/swipemix/feed?limit=20&offset=10",
    );
    expect(result).toEqual([mockTrack]);
  });

  it("returns an empty array when the response has no tracks field", async () => {
    mockGet.mockResolvedValueOnce({} as { tracks: DeezerTrack[] });

    const result = await getSwipemixFeed(10, 0);

    expect(result).toEqual([]);
  });
});
