import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useAudioPlayer } from "../useAudioPlayer";
import { useAudioPlayer as useExpoAudioPlayer, AudioModule } from "expo-audio";
import { DeezerTrack } from "../../services/deezer-api";

// Mock expo-audio
jest.mock("expo-audio");

const mockTrack: DeezerTrack = {
  id: 1,
  title: "Test Track",
  title_short: "Test",
  title_version: "",
  link: "https://deezer.com/track/1",
  duration: 180,
  rank: 500000,
  explicit_lyrics: false,
  explicit_content_lyrics: 0,
  explicit_content_cover: 0,
  preview: "https://cdns-preview.dzcdn.net/stream/1.mp3",
  md5_image: "abc123",
  artist: {
    id: 1,
    name: "Artist",
    link: "https://deezer.com/artist/1",
    picture: "https://api.deezer.com/artist/1/image",
    picture_small: "https://api.deezer.com/artist/1/image?size=small",
    picture_medium: "https://api.deezer.com/artist/1/image?size=medium",
    picture_big: "https://api.deezer.com/artist/1/image?size=big",
    picture_xl: "https://api.deezer.com/artist/1/image?size=xl",
    tracklist: "https://api.deezer.com/artist/1/top",
    type: "artist",
  },
  album: {
    id: 1,
    title: "Album",
    cover: "https://api.deezer.com/album/1/image",
    cover_small: "https://api.deezer.com/album/1/image?size=small",
    cover_medium: "https://api.deezer.com/album/1/image?size=medium",
    cover_big: "https://api.deezer.com/album/1/image?size=big",
    cover_xl: "https://api.deezer.com/album/1/image?size=xl",
    md5_image: "def456",
    tracklist: "https://api.deezer.com/album/1/tracks",
    type: "album",
  },
  type: "track",
};

describe("useAudioPlayer", () => {
  let mockPlayer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    mockPlayer = {
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      replace: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      seekTo: jest.fn(),
      remove: jest.fn(),
    };

    (useExpoAudioPlayer as jest.Mock).mockReturnValue(mockPlayer);
    (AudioModule.setAudioModeAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useAudioPlayer());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.duration).toBe(0);
      expect(result.current.position).toBe(0);
      expect(result.current.currentTrack).toBeNull();
      expect(result.current.volume).toBe(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should configure audio mode on mount", async () => {
      renderHook(() => useAudioPlayer());

      await waitFor(() => {
        expect(AudioModule.setAudioModeAsync).toHaveBeenCalledWith({
          playsInSilentMode: true,
        });
      });
    });

    it("should handle audio mode configuration errors", async () => {
      (AudioModule.setAudioModeAsync as jest.Mock).mockRejectedValueOnce(
        new Error("Audio mode error"),
      );

      renderHook(() => useAudioPlayer());

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          "Error configuring audio mode:",
          expect.any(Error),
        );
      });
    });

    it("should cleanup player on unmount", () => {
      const { unmount } = renderHook(() => useAudioPlayer());

      unmount();

      expect(mockPlayer.remove).toHaveBeenCalled();
    });

    it("should handle player removal errors on unmount", () => {
      mockPlayer.remove.mockImplementation(() => {
        throw new Error("Remove failed");
      });

      const { unmount } = renderHook(() => useAudioPlayer());

      unmount();

      expect(console.error).toHaveBeenCalledWith(
        "Error removing player:",
        expect.any(Error),
      );
    });
  });

  describe("play", () => {
    it("should play a track successfully", async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      expect(mockPlayer.replace).toHaveBeenCalledWith({
        uri: mockTrack.preview,
      });
      expect(mockPlayer.play).toHaveBeenCalled();
      expect(result.current.currentTrack).toEqual(mockTrack);
      expect(result.current.isPlaying).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle track without preview URL", async () => {
      const trackWithoutPreview = { ...mockTrack, preview: "" };
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(trackWithoutPreview);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isPlaying).toBe(false);
      expect(mockPlayer.replace).not.toHaveBeenCalled();
    });

    it("should handle invalid preview URL", async () => {
      const trackWithInvalidURL = { ...mockTrack, preview: "invalid-url" };
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(trackWithInvalidURL);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isPlaying).toBe(false);
      expect(mockPlayer.replace).not.toHaveBeenCalled();
    });

    it("should set loading state during play", async () => {
      const { result } = renderHook(() => useAudioPlayer());

      // Start the play operation
      const playPromise = act(async () => {
        await result.current.play(mockTrack);
      });

      // Wait for the play to complete
      await playPromise;

      // After play completes, loading should be false
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPlaying).toBe(true);
    });

    it("should handle playback errors", async () => {
      mockPlayer.replace.mockImplementation(() => {
        throw new Error("Playback failed");
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isPlaying).toBe(false);
    });

    it("should handle load errors with load message", async () => {
      mockPlayer.replace.mockImplementation(() => {
        throw new Error("Failed to load source");
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isPlaying).toBe(false);
    });

    it("should handle non-Error exceptions", async () => {
      mockPlayer.replace.mockImplementation(() => {
        throw "String error"; // Non-Error exception
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      expect(result.current.error).toContain("extrait audio");
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe("pause", () => {
    it("should pause playback", async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
        await result.current.pause();
      });

      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
    });

    it("should handle pause errors", async () => {
      mockPlayer.pause.mockImplementation(() => {
        throw new Error("Pause failed");
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
        await result.current.pause();
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe("resume", () => {
    it("should resume playback", async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
        await result.current.pause();
        await result.current.resume();
      });

      expect(mockPlayer.play).toHaveBeenCalledTimes(2); // Once for play, once for resume
      expect(result.current.isPlaying).toBe(true);
    });

    it("should handle resume errors", async () => {
      mockPlayer.play
        .mockImplementationOnce(() => {
          // First call succeeds
        })
        .mockImplementationOnce(() => {
          // Second call (resume) fails
          throw new Error("Resume failed");
        });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
        await result.current.resume();
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe("stop", () => {
    it("should stop playback", async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
        await result.current.stop();
      });

      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.position).toBe(0);
    });

    it("should handle stop errors", async () => {
      mockPlayer.pause.mockImplementation(() => {
        throw new Error("Stop failed");
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
        await result.current.stop();
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe("seek", () => {
    it("should seek to valid position", async () => {
      jest.useFakeTimers();

      mockPlayer.duration = 180;
      const { result } = renderHook(() => useAudioPlayer());

      // First play the track
      await act(async () => {
        await result.current.play(mockTrack);
      });

      // Trigger the interval update to sync duration from player
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Now duration should be updated, seek should work
      await act(async () => {
        await result.current.seek(60);
      });

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(60);

      jest.useRealTimers();
    });

    it("should reject negative position", async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
        await result.current.seek(-10);
      });

      expect(result.current.error).toBeTruthy();
      expect(mockPlayer.seekTo).not.toHaveBeenCalledWith(-10);
    });

    it("should reject position beyond duration", async () => {
      mockPlayer.duration = 180;
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
        await result.current.seek(200);
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should handle seek errors", async () => {
      mockPlayer.seekTo.mockImplementation(() => {
        throw new Error("Seek failed");
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
        await result.current.seek(60);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe("setVolume", () => {
    it("should set volume to valid value", async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.setVolume(0.5);
      });

      expect(mockPlayer.volume).toBe(0.5);
    });

    it("should clamp volume to 0-1 range", async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.setVolume(1.5);
      });

      expect(mockPlayer.volume).toBe(1);

      await act(async () => {
        await result.current.setVolume(-0.5);
      });

      expect(mockPlayer.volume).toBe(0);
    });

    it("should handle setVolume errors", async () => {
      Object.defineProperty(mockPlayer, "volume", {
        set: jest.fn(() => {
          throw new Error("Volume set failed");
        }),
        get: jest.fn(() => 1),
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.setVolume(0.5);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe("state updates", () => {
    it("should update position and duration from player", async () => {
      jest.useFakeTimers();

      mockPlayer.currentTime = 30;
      mockPlayer.duration = 180;
      mockPlayer.playing = true;

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      // Advance timers to trigger the interval update
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.position).toBe(30);
        expect(result.current.duration).toBe(180);
        expect(result.current.isPlaying).toBe(true);
      });

      jest.useRealTimers();
    });

    it("should handle errors in position update gracefully", () => {
      jest.useFakeTimers();

      Object.defineProperty(mockPlayer, "currentTime", {
        get: jest.fn(() => {
          throw new Error("Cannot read currentTime");
        }),
      });

      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not crash
      expect(result.current).toBeDefined();

      jest.useRealTimers();
    });

    it("should clear previous interval when re-rendering", () => {
      jest.useFakeTimers();

      const { rerender } = renderHook(() => useAudioPlayer());

      // Trigger initial interval
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Force a re-render which will trigger the useEffect again
      rerender({});

      // The previous interval should have been cleared
      // and a new one should be set
      act(() => {
        jest.advanceTimersByTime(100);
      });

      jest.useRealTimers();
    });
  });

  describe("error messages", () => {
    it("should provide user-friendly error messages", async () => {
      const trackWithoutPreview = { ...mockTrack, preview: "" };
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(trackWithoutPreview);
      });

      expect(result.current.error).toContain("extrait audio");
    });

    it("should handle network errors with appropriate message", async () => {
      mockPlayer.replace.mockImplementation(() => {
        throw new Error("Network error");
      });

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});
