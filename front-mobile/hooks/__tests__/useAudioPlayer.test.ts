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

    it("should suppress NativeSharedObjectNotFoundException on remove", () => {
      mockPlayer.remove.mockImplementation(() => {
        throw new Error("NativeSharedObjectNotFoundException");
      });

      const { unmount } = renderHook(() => useAudioPlayer());

      expect(() => mockPlayer.remove()).not.toThrow();

      unmount();
    });

    it("should rethrow unexpected errors on remove", () => {
      mockPlayer.remove.mockImplementation(() => {
        throw new Error("SomeOtherError");
      });

      renderHook(() => useAudioPlayer());

      expect(() => mockPlayer.remove()).toThrow("SomeOtherError");
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

    it("should clear error state when stopping", async () => {
      const trackWithoutPreview = { ...mockTrack, preview: "" };
      const { result } = renderHook(() => useAudioPlayer());

      // Trigger an error
      await act(async () => {
        await result.current.play(trackWithoutPreview);
      });
      expect(result.current.error).toBeTruthy();

      // Stop should clear the error
      await act(async () => {
        await result.current.stop();
      });
      expect(result.current.error).toBeNull();
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

    it("should be a no-op after unmount to prevent NativeSharedObjectNotFoundException", async () => {
      const { result, unmount } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      unmount();

      // stop() after unmount should not throw or call native player methods
      await act(async () => {
        await result.current.stop();
      });

      expect(mockPlayer.pause).not.toHaveBeenCalled();
      expect(mockPlayer.seekTo).not.toHaveBeenCalled();
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
        jest.advanceTimersByTime(250);
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
        jest.advanceTimersByTime(250);
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
        jest.advanceTimersByTime(250);
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
        jest.advanceTimersByTime(250);
      });

      // Force a re-render which will trigger the useEffect again
      rerender({});

      // The previous interval should have been cleared
      // and a new one should be set
      act(() => {
        jest.advanceTimersByTime(250);
      });

      jest.useRealTimers();
    });
  });

  describe("race condition on rapid play calls", () => {
    it("should reflect only the last play call in state", async () => {
      const mockTrack2: DeezerTrack = {
        ...mockTrack,
        id: 2,
        title: "Track 2",
        preview: "https://cdns-preview.dzcdn.net/stream/2.mp3",
      };

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        // Simulate two rapid play calls — second should win
        result.current.play(mockTrack);
        await result.current.play(mockTrack2);
      });

      expect(result.current.currentTrack).toEqual(mockTrack2);
      expect(mockPlayer.replace).toHaveBeenLastCalledWith({
        uri: mockTrack2.preview,
      });
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

  describe("playback stall detection", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should detect stalled playback and show error when no onRetry", async () => {
      mockPlayer.playing = false;
      mockPlayer.currentTime = 0;

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.error).toBeNull();

      // Advance past the verification delay
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.error).toContain("démarrer");
      expect(result.current.isPlaying).toBe(false);
    });

    it("should not flag stall if player is playing", async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      // Simulate player actually playing
      mockPlayer.playing = true;
      mockPlayer.currentTime = 1;

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isPlaying).toBe(true);
    });

    it("should call onRetry and play fresh track on stall", async () => {
      mockPlayer.playing = false;
      mockPlayer.currentTime = 0;

      const freshTrack: DeezerTrack = {
        ...mockTrack,
        preview: "https://cdns-preview.dzcdn.net/stream/fresh.mp3",
      };
      // Simulate player working after retry provides fresh URL
      const onRetry = jest.fn().mockImplementation(async () => {
        mockPlayer.playing = true;
        return freshTrack;
      });

      const { result } = renderHook(() => useAudioPlayer({ onRetry }));

      await act(async () => {
        await result.current.play(mockTrack);
      });

      // Player still stalled — playing=false, currentTime=0
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(onRetry).toHaveBeenCalledWith(mockTrack);
      expect(mockPlayer.replace).toHaveBeenLastCalledWith({
        uri: freshTrack.preview,
      });
    });

    it("should show error when onRetry returns null", async () => {
      mockPlayer.playing = false;
      mockPlayer.currentTime = 0;

      const onRetry = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useAudioPlayer({ onRetry }));

      await act(async () => {
        await result.current.play(mockTrack);
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(onRetry).toHaveBeenCalledWith(mockTrack);
      expect(result.current.error).toContain("démarrer");
      expect(result.current.isPlaying).toBe(false);
    });

    it("should show error when retry also stalls", async () => {
      mockPlayer.playing = false;
      mockPlayer.currentTime = 0;

      const freshTrack: DeezerTrack = {
        ...mockTrack,
        preview: "https://cdns-preview.dzcdn.net/stream/fresh.mp3",
      };
      // onRetry returns a fresh track but player remains stalled
      const onRetry = jest.fn().mockResolvedValue(freshTrack);

      const { result } = renderHook(() => useAudioPlayer({ onRetry }));

      await act(async () => {
        await result.current.play(mockTrack);
      });

      // First verification detects stall → triggers retry
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(onRetry).toHaveBeenCalledTimes(1);

      // Second verification detects stall again → should show error (no more retry)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(onRetry).toHaveBeenCalledTimes(1); // Not called again
      expect(result.current.error).toContain("démarrer");
      expect(result.current.isPlaying).toBe(false);
    });

    it("should cancel verification when user pauses before delay", async () => {
      mockPlayer.playing = false;
      mockPlayer.currentTime = 0;

      const onRetry = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useAudioPlayer({ onRetry }));

      await act(async () => {
        await result.current.play(mockTrack);
      });

      // Pause before the verification delay fires
      await act(async () => {
        await result.current.pause();
      });

      // Advance past the verification delay
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should not show stall error or call onRetry
      expect(result.current.error).toBeNull();
      expect(onRetry).not.toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
    });

    it("should cancel verification on new play call", async () => {
      mockPlayer.playing = false;
      mockPlayer.currentTime = 0;

      const mockTrack2: DeezerTrack = {
        ...mockTrack,
        id: 2,
        preview: "https://cdns-preview.dzcdn.net/stream/2.mp3",
      };

      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        await result.current.play(mockTrack);
      });

      // Play a new track before verification fires
      mockPlayer.playing = true;
      await act(async () => {
        await result.current.play(mockTrack2);
      });

      // Original verification timeout fires but should be cancelled
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should not show error from the first play
      expect(result.current.error).toBeNull();
    });
  });
});
