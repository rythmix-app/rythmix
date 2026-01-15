import { renderHook, waitFor } from "@testing-library/react-native";
import { useSwipeMix } from "../useSwipeMix";
import { deezerAPI, DeezerTrack } from "@/services/deezer-api";
import { useAudioPlayer } from "../useAudioPlayer";
import { deezerTracksToCardData } from "@/utils/deezer-adapter";
import { MusicCardData } from "@/components/swipe";

// Mock des dépendances
jest.mock("@/services/deezer-api");
jest.mock("../useAudioPlayer");
jest.mock("@/utils/deezer-adapter");

const mockDeezerAPI = deezerAPI as jest.Mocked<typeof deezerAPI>;
const mockUseAudioPlayer = useAudioPlayer as jest.MockedFunction<
  typeof useAudioPlayer
>;
const mockDeezerTracksToCardData =
  deezerTracksToCardData as jest.MockedFunction<typeof deezerTracksToCardData>;

describe("useSwipeMix", () => {
  // Helper function to create mock tracks
  const createMockTrack = (id: number): DeezerTrack => ({
    id,
    title: `Track ${id}`,
    title_short: `Track ${id}`,
    title_version: "",
    link: `https://deezer.com/track/${id}`,
    duration: 180 + id * 10,
    rank: 100 - id * 5,
    explicit_lyrics: false,
    explicit_content_lyrics: 0,
    explicit_content_cover: 0,
    preview: `https://cdn.deezer.com/preview/${id}`,
    md5_image: `abc${id}`,
    artist: {
      id,
      name: `Artist ${id}`,
      link: `https://deezer.com/artist/${id}`,
      picture: `https://cdn.deezer.com/artist/${id}`,
      picture_small: `https://cdn.deezer.com/artist/${id}/small`,
      picture_medium: `https://cdn.deezer.com/artist/${id}/medium`,
      picture_big: `https://cdn.deezer.com/artist/${id}/big`,
      picture_xl: `https://cdn.deezer.com/artist/${id}/xl`,
      tracklist: `https://api.deezer.com/artist/${id}/top`,
      type: "artist",
    },
    album: {
      id,
      title: `Album ${id}`,
      cover: `https://cdn.deezer.com/album/${id}`,
      cover_small: `https://cdn.deezer.com/album/${id}/small`,
      cover_medium: `https://cdn.deezer.com/album/${id}/medium`,
      cover_big: `https://cdn.deezer.com/album/${id}/big`,
      cover_xl: `https://cdn.deezer.com/album/${id}/xl`,
      md5_image: `def${id}`,
      tracklist: `https://api.deezer.com/album/${id}/tracks`,
      type: "album",
    },
    type: "track",
  });

  // Mock data - 10 tracks to satisfy hasMoreTracks condition
  const mockTracks: DeezerTrack[] = Array.from({ length: 10 }, (_, i) =>
    createMockTrack(i + 1),
  );

  const mockAudioPlayer = {
    currentTrack: null as DeezerTrack | null,
    isPlaying: false,
    isLoading: false,
    duration: 0,
    position: 0,
    volume: 1,
    error: null,
    play: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    seek: jest.fn(),
    setVolume: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    // Reset mockAudioPlayer
    mockAudioPlayer.currentTrack = null;
    mockAudioPlayer.isPlaying = false;
    mockAudioPlayer.isLoading = false;
    mockAudioPlayer.volume = 1;
    mockAudioPlayer.error = null;
    mockAudioPlayer.play = jest.fn().mockResolvedValue(undefined);
    mockAudioPlayer.pause = jest.fn().mockResolvedValue(undefined);
    mockAudioPlayer.resume = jest.fn().mockResolvedValue(undefined);
    mockAudioPlayer.stop = jest.fn();
    mockAudioPlayer.seek = jest.fn().mockResolvedValue(undefined);
    mockAudioPlayer.setVolume = jest.fn().mockResolvedValue(undefined);

    // Setup default mocks
    mockUseAudioPlayer.mockReturnValue(mockAudioPlayer);
    mockDeezerTracksToCardData.mockImplementation((tracks) => {
      const colors: ("darkGreen" | "cyan" | "lightBlue")[] = [
        "darkGreen",
        "cyan",
        "lightBlue",
      ];
      return tracks.map((track, index) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
        coverImage: track.album.cover_big,
        tags: {
          primary: "MUSIQUE",
          secondary: "DÉCOUVERTE",
        },
        color: colors[index % colors.length],
      }));
    });
    mockDeezerAPI.getTopTracks.mockResolvedValue({
      data: mockTracks,
      total: mockTracks.length,
    });
  });

  describe("initialization", () => {
    it("should load tracks on mount", async () => {
      const { result } = renderHook(() => useSwipeMix());

      expect(result.current.isLoadingCards).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoadingCards).toBe(false);
      });

      expect(mockDeezerAPI.getTopTracks).toHaveBeenCalledWith(10, 0);
      expect(result.current.cards).toHaveLength(10);
      expect(result.current.cards[0].id).toBe("1");
      expect(result.current.cards[0].title).toBe("Track 1");
      expect(result.current.error).toBeNull();
    });

    it("should use custom initialLimit", async () => {
      const { result } = renderHook(() => useSwipeMix({ initialLimit: 20 }));

      await waitFor(() => {
        expect(result.current.isLoadingCards).toBe(false);
      });

      expect(mockDeezerAPI.getTopTracks).toHaveBeenCalledWith(20, 0);
    });

    it("should handle loading errors", async () => {
      const errorMessage = "Network error";
      mockDeezerAPI.getTopTracks.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.isLoadingCards).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.cards).toEqual([]);
    });

    it("should handle non-Error exceptions", async () => {
      mockDeezerAPI.getTopTracks.mockRejectedValueOnce("string error");

      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.isLoadingCards).toBe(false);
      });

      expect(result.current.error).toBe(
        "Erreur lors du chargement des musiques",
      );
    });
  });

  describe("swipe handlers", () => {
    it("should handle swipe left", async () => {
      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const firstCard = result.current.cards[0];
      result.current.handlers.onSwipeLeft(firstCard);

      expect(console.log).toHaveBeenCalledWith("Swiped left:", "Track 1");
    });

    it("should stop audio on swipe left if current track", async () => {
      mockAudioPlayer.currentTrack = mockTracks[0];

      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const firstCard = result.current.cards[0];
      result.current.handlers.onSwipeLeft(firstCard);

      expect(mockAudioPlayer.stop).toHaveBeenCalled();
    });

    it("should handle swipe right", async () => {
      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const firstCard = result.current.cards[0];
      await result.current.handlers.onSwipeRight(firstCard);

      expect(console.log).toHaveBeenCalledWith("Swiped right:", "Track 1");
    });

    it("should stop audio on swipe right if current track", async () => {
      mockAudioPlayer.currentTrack = mockTracks[0];

      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const firstCard = result.current.cards[0];
      await result.current.handlers.onSwipeRight(firstCard);

      expect(mockAudioPlayer.stop).toHaveBeenCalled();
    });
  });

  describe("play/pause toggle", () => {
    it("should pause when playing current track", async () => {
      mockAudioPlayer.currentTrack = mockTracks[0];
      mockAudioPlayer.isPlaying = true;

      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const firstCard = result.current.cards[0];
      await result.current.handlers.onTogglePlay(firstCard);

      expect(mockAudioPlayer.pause).toHaveBeenCalled();
    });

    it("should resume when paused current track", async () => {
      mockAudioPlayer.currentTrack = mockTracks[0];
      mockAudioPlayer.isPlaying = false;

      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const firstCard = result.current.cards[0];
      await result.current.handlers.onTogglePlay(firstCard);

      expect(mockAudioPlayer.resume).toHaveBeenCalled();
    });

    it("should play new track when not current", async () => {
      mockAudioPlayer.currentTrack = mockTracks[0];

      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const secondCard = result.current.cards[1];
      await result.current.handlers.onTogglePlay(secondCard);

      expect(mockAudioPlayer.play).toHaveBeenCalledWith(mockTracks[1]);
    });

    it("should not play if track not found", async () => {
      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const unknownCard: MusicCardData = {
        id: "999",
        title: "Unknown",
        artist: "Unknown",
        album: "Unknown",
        coverImage: "",
        tags: {
          primary: "UNKNOWN",
          secondary: "UNKNOWN",
        },
        color: "darkGreen",
      };

      await result.current.handlers.onTogglePlay(unknownCard);

      expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    });
  });

  describe("card appear handler", () => {
    it("should play track when card appears", async () => {
      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const firstCard = result.current.cards[0];
      await result.current.handlers.onCardAppear(firstCard);

      await waitFor(() => {
        expect(mockAudioPlayer.play).toHaveBeenCalledWith(mockTracks[0]);
      });
    });

    it("should not replay if already playing", async () => {
      mockAudioPlayer.currentTrack = mockTracks[0];

      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const firstCard = result.current.cards[0];
      await result.current.handlers.onCardAppear(firstCard);

      expect(mockAudioPlayer.play).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        "Card already playing, skipping:",
        "1",
      );
    });

    it("should warn if track not found", async () => {
      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const unknownCard: MusicCardData = {
        id: "999",
        title: "Unknown",
        artist: "Unknown",
        album: "Unknown",
        coverImage: "",
        tags: {
          primary: "UNKNOWN",
          secondary: "UNKNOWN",
        },
        color: "darkGreen",
      };

      await result.current.handlers.onCardAppear(unknownCard);

      expect(console.warn).toHaveBeenCalledWith(
        "Track not found for card:",
        "999",
      );
      expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    });
  });

  describe("empty handler", () => {
    it("should reload tracks when empty", async () => {
      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      mockDeezerAPI.getTopTracks.mockClear();

      result.current.handlers.onEmpty();

      await waitFor(() => {
        expect(mockDeezerAPI.getTopTracks).toHaveBeenCalledWith(10, 0);
      });
    });
  });

  describe("pagination", () => {
    it("should load more tracks", async () => {
      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      const initialCardCount = result.current.cards.length;

      // Clear previous calls
      mockDeezerAPI.getTopTracks.mockClear();

      // Setup mock for pagination call - return same tracks for simplicity
      mockDeezerAPI.getTopTracks.mockResolvedValueOnce({
        data: mockTracks,
        total: mockTracks.length,
      });

      await result.current.actions.loadMore();

      await waitFor(() => {
        expect(mockDeezerAPI.getTopTracks).toHaveBeenCalledWith(10, 10);
        expect(result.current.cards).toHaveLength(initialCardCount + 10);
      });
    });

    it("should not load more if already loading", async () => {
      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      // Clear calls from initialization
      mockDeezerAPI.getTopTracks.mockClear();

      // Setup slow-resolving promise to simulate loading
      let resolveLoad: (value: any) => void;
      const slowPromise = new Promise((resolve) => {
        resolveLoad = resolve;
      });

      mockDeezerAPI.getTopTracks.mockReturnValueOnce(slowPromise as any);

      // Trigger first load (will be slow)
      const loadPromise1 = result.current.actions.loadMore();

      // Wait a bit to ensure first load has started
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Try to load again while first is still loading
      const loadPromise2 = result.current.actions.loadMore();

      // Resolve the slow promise
      resolveLoad!({
        data: mockTracks,
        total: mockTracks.length,
      });

      await Promise.all([loadPromise1, loadPromise2]);

      // Should only be called once (second call was blocked)
      expect(mockDeezerAPI.getTopTracks).toHaveBeenCalledTimes(1);
    });

    it("should not load more if no more tracks", async () => {
      // Retourner moins de tracks que la limite
      mockDeezerAPI.getTopTracks.mockResolvedValueOnce({
        data: [mockTracks[0]],
        total: 1,
      });

      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(1);
      });

      mockDeezerAPI.getTopTracks.mockClear();

      await result.current.actions.loadMore();

      expect(mockDeezerAPI.getTopTracks).not.toHaveBeenCalled();
    });
  });

  describe("reload action", () => {
    it("should reset cards and reload from beginning", async () => {
      const { result } = renderHook(() => useSwipeMix());

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(10);
      });

      // Clear the mock to verify reload is called with index 0
      mockDeezerAPI.getTopTracks.mockClear();

      mockDeezerAPI.getTopTracks.mockResolvedValueOnce({
        data: [mockTracks[0]],
        total: 1,
      });

      await result.current.actions.reload();

      await waitFor(() => {
        expect(result.current.cards).toHaveLength(1);
        expect(mockDeezerAPI.getTopTracks).toHaveBeenCalledWith(10, 0);
      });
    });
  });
});
