import {
  deezerTrackToCardData,
  deezerTracksToCardData,
} from "../deezer-adapter";
import { DeezerTrack } from "@/services/deezer-api";

describe("deezer-adapter", () => {
  const mockTrack: DeezerTrack = {
    id: 123,
    title: "Test Track",
    title_short: "Test",
    title_version: "",
    link: "http://test.com",
    duration: 200,
    rank: 1,
    explicit_lyrics: false,
    explicit_content_lyrics: 0,
    explicit_content_cover: 0,
    preview: "preview.mp3",
    md5_image: "img123",
    artist: {
      id: 456,
      name: "Test Artist",
      link: "",
      picture: "",
      picture_small: "",
      picture_medium: "",
      picture_big: "",
      picture_xl: "",
      tracklist: "",
      type: "artist",
    },
    album: {
      id: 789,
      title: "Test Album",
      cover: "cover.jpg",
      cover_small: "",
      cover_medium: "",
      cover_big: "cover_big.jpg",
      cover_xl: "",
      md5_image: "",
      tracklist: "",
      type: "album",
    },
    type: "track",
  };

  describe("deezerTrackToCardData", () => {
    it("should convert a track with default genre", () => {
      const card = deezerTrackToCardData(mockTrack, 0);
      expect(card.id).toBe("123");
      expect(card.title).toBe("Test");
      expect(card.artist).toBe("Test Artist");
      expect(card.tags.primary).toBe("MUSIQUE");
    });

    it("should use provided genre name", () => {
      const card = deezerTrackToCardData(mockTrack, 0, "ROCK");
      expect(card.tags.primary).toBe("ROCK");
    });

    it("should handle missing title_short", () => {
      const trackWithoutShort = { ...mockTrack, title_short: "" };
      const card = deezerTrackToCardData(trackWithoutShort, 0);
      expect(card.title).toBe("Test Track");
    });
  });

  describe("deezerTracksToCardData", () => {
    const mockTracks = [mockTrack];
    const albumGenresMapping = { 789: ["POP", "ROCK"] };

    it("should convert multiple tracks with multiple genre mapping", () => {
      const cards = deezerTracksToCardData(mockTracks, {}, albumGenresMapping);
      expect(cards[0].tags.primary).toBe("POP");
      expect(cards[0].tags.secondary).toBe("ROCK");
    });

    it("should use discovery fallback if only one genre is available", () => {
      const cards = deezerTracksToCardData(mockTracks, {}, { 789: ["POP"] });
      expect(cards[0].tags.primary).toBe("POP");
      expect(cards[0].tags.secondary).toBe("DÉCOUVERTE");
    });
  });
});
