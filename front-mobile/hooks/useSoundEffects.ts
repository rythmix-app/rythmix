import { useEffect, useRef } from "react";
import { createAudioPlayer } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { useSoundSettingsStore } from "@/stores/soundSettingsStore";

type SoundCategory = "swipe" | "game";
export type SoundName =
  | "swipe-like"
  | "swipe-dislike"
  | "swipe-back"
  | "timer-warning"
  | "timer-danger";

export interface UseSoundEffectsReturn {
  play: (sound: SoundName) => Promise<void>;
  loop: (sound: SoundName) => void;
  stop: (sound: SoundName) => void;
}

const SOUND_SOURCES: Record<SoundName, number> = {
  "swipe-like": require("@/assets/sounds/swipe-like.mp3"),
  "swipe-dislike": require("@/assets/sounds/swipe-dislike.mp3"),
  "swipe-back": require("@/assets/sounds/swipe-back.mp3"),
  "timer-warning": require("@/assets/sounds/timer-warning.mp3"),
  "timer-danger": require("@/assets/sounds/timer-danger.mp3"),
};

const SOUND_CATEGORY: Record<SoundName, SoundCategory> = {
  "swipe-like": "swipe",
  "swipe-dislike": "swipe",
  "swipe-back": "swipe",
  "timer-warning": "game",
  "timer-danger": "game",
};

export const useSoundEffects = (): UseSoundEffectsReturn => {
  const { swipeSoundsEnabled, gameSoundsEnabled } = useSoundSettingsStore();
  const playersRef = useRef<Partial<Record<SoundName, AudioPlayer>>>({});
  const enabledRef = useRef({ swipeSoundsEnabled, gameSoundsEnabled });

  useEffect(() => {
    enabledRef.current = { swipeSoundsEnabled, gameSoundsEnabled };
  }, [swipeSoundsEnabled, gameSoundsEnabled]);

  useEffect(() => {
    const loaded: Partial<Record<SoundName, AudioPlayer>> = {};
    for (const [name, source] of Object.entries(SOUND_SOURCES) as [
      SoundName,
      number,
    ][]) {
      try {
        const player = createAudioPlayer(source);
        player.volume = 0.5;
        loaded[name] = player;
      } catch (err) {
        if (__DEV__) {
          console.log(`[SoundEffects] Failed to load ${name}:`, err);
        }
      }
    }
    playersRef.current = loaded;

    return () => {
      for (const player of Object.values(loaded)) {
        try {
          player?.remove();
        } catch {}
      }
    };
  }, []);

  const play = async (sound: SoundName): Promise<void> => {
    const category = SOUND_CATEGORY[sound];
    const { swipeSoundsEnabled: swipeOn, gameSoundsEnabled: gameOn } =
      enabledRef.current;
    const enabled = category === "swipe" ? swipeOn : gameOn;
    if (!enabled) return;

    try {
      const player = playersRef.current[sound];
      if (!player) return;
      player.seekTo(0);
      player.play();
    } catch (err) {
      if (__DEV__) {
        console.log(`[SoundEffects] Error playing ${sound}:`, err);
      }
    }
  };

  const loop = (sound: SoundName): void => {
    const category = SOUND_CATEGORY[sound];
    const { swipeSoundsEnabled: swipeOn, gameSoundsEnabled: gameOn } =
      enabledRef.current;
    const enabled = category === "swipe" ? swipeOn : gameOn;
    if (!enabled) return;

    try {
      const player = playersRef.current[sound];
      if (!player) return;
      player.loop = true;
      player.seekTo(0);
      player.play();
    } catch (err) {
      if (__DEV__) {
        console.log(`[SoundEffects] Error looping ${sound}:`, err);
      }
    }
  };

  const stop = (sound: SoundName): void => {
    try {
      const player = playersRef.current[sound];
      if (!player) return;
      player.loop = false;
      player.pause();
    } catch (err) {
      if (__DEV__) {
        console.log(`[SoundEffects] Error stopping ${sound}:`, err);
      }
    }
  };

  return { play, loop, stop };
};
