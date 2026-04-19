import {
  createMyLikedTrack,
  deleteMyLikedTrack,
  getMyLikedTracks,
} from "../likedTrackService";

import { get, post, del } from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  del: jest.fn(),
}));

const mockGet = get as jest.MockedFunction<typeof get>;
const mockPost = post as jest.MockedFunction<typeof post>;
const mockDel = del as jest.MockedFunction<typeof del>;

const mockLikedTrack = {
  id: "liked-track-uuid",
  userId: "user-1",
  deezerTrackId: "123456",
  title: "Test Song",
  artist: "Test Artist",
  type: "track" as const,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createMyLikedTrack", () => {
  it("should create and return a liked track", async () => {
    mockPost.mockResolvedValueOnce({ likedTrack: mockLikedTrack });
    const request = {
      deezerTrackId: "123456",
      title: "Test Song",
      artist: "Test Artist",
      type: "track" as const,
    };
    const result = await createMyLikedTrack(request);
    expect(result).toEqual(mockLikedTrack);
    expect(mockPost).toHaveBeenCalledWith("/api/liked-tracks/me", request);
  });
});

describe("deleteMyLikedTrack", () => {
  it("should call delete with correct endpoint", async () => {
    mockDel.mockResolvedValueOnce(undefined);
    await deleteMyLikedTrack("123456");
    expect(mockDel).toHaveBeenCalledWith("/api/liked-tracks/me/123456");
  });
});

describe("getMyLikedTracks", () => {
  it("should return list of liked tracks", async () => {
    mockGet.mockResolvedValueOnce({ likedTracks: [mockLikedTrack] });
    const result = await getMyLikedTracks();
    expect(result).toEqual([mockLikedTrack]);
    expect(mockGet).toHaveBeenCalledWith("/api/liked-tracks/me");
  });
});
