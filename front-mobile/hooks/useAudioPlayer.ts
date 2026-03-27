import { AudioModule, useAudioPlayer as useExpoAudioPlayer } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { DeezerTrack } from "@/services/deezer-api";
import { AudioPlayerError } from "@/types/errors";

interface AudioPlayerState {
  isPlaying: boolean;
  duration: number;
  position: number;
  currentTrack: DeezerTrack | null;
  volume: number;
  isLoading: boolean;
  error: string | null;
}

interface AudioPlayerActions {
  play: (track: DeezerTrack) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
}

export type UseAudioPlayerReturn = AudioPlayerState & AudioPlayerActions;

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  const player = useExpoAudioPlayer();

  const [currentTrack, setCurrentTrack] = useState<DeezerTrack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const playRequestIdRef = useRef(0);

  // Configurer le mode audio au montage
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentMode: true,
        });
      } catch (err) {
        console.error("Error configuring audio mode:", err);
      }
    };

    configureAudio();

    // Cleanup au démontage
    // Ne pas appeler player.remove() ici : useExpoAudioPlayer gère déjà le cycle
    // de vie natif et appelle remove() en premier (hooks imbriqués nettoyés dans
    // l'ordre de création). Un double remove provoquerait NativeSharedObjectNotFoundException.
    return () => {
      isMountedRef.current = false;
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mettre à jour la position et la durée toutes les 250ms
  useEffect(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    updateIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      try {
        setIsPlaying(player.playing);
        setPosition(player.currentTime);
        setDuration(player.duration || 0);
      } catch {
        // Ignorer les erreurs de lecture des propriétés
      }
    }, 250);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [player]);

  const play = async (track: DeezerTrack): Promise<void> => {
    const requestId = ++playRequestIdRef.current;

    try {
      setIsLoading(true);
      setError(null);

      // Vérifier que l'URL de preview existe
      if (!track.preview) {
        throw AudioPlayerError.loadFailed(
          "Aucun extrait audio disponible pour ce titre",
        );
      }

      // Vérifier que l'URL est valide
      if (!track.preview.startsWith("http")) {
        throw AudioPlayerError.loadFailed("URL d'extrait audio invalide");
      }

      player.replace({ uri: track.preview });
      player.play();

      if (requestId !== playRequestIdRef.current) return;

      setCurrentTrack(track);
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err) {
      if (requestId !== playRequestIdRef.current) return;

      let error: AudioPlayerError;

      if (err instanceof AudioPlayerError) {
        error = err;
      } else if (err instanceof Error) {
        // Déterminer le type d'erreur
        if (
          err.message.includes("network") ||
          err.message.includes("Network")
        ) {
          error = AudioPlayerError.network();
        } else if (
          err.message.includes("load") ||
          err.message.includes("source")
        ) {
          error = AudioPlayerError.loadFailed(err.message);
        } else {
          error = AudioPlayerError.playbackError(err.message);
        }
      } else {
        error = AudioPlayerError.loadFailed(
          "Erreur inconnue lors du chargement",
        );
      }

      setError(error.getUserMessage());
      setIsLoading(false);
      setIsPlaying(false);
      console.error("Error playing track:", error);
    }
  };

  const pause = async (): Promise<void> => {
    if (!isMountedRef.current) return;
    try {
      player.pause();
      setIsPlaying(false);
    } catch (err) {
      const error = AudioPlayerError.playbackError(
        "Impossible de mettre en pause",
      );
      setError(error.getUserMessage());
      console.error("Error pausing:", err);
    }
  };

  const resume = async (): Promise<void> => {
    if (!isMountedRef.current) return;
    try {
      player.play();
      setIsPlaying(true);
    } catch (err) {
      const error = AudioPlayerError.playbackError(
        "Impossible de reprendre la lecture",
      );
      setError(error.getUserMessage());
      console.error("Error resuming:", err);
    }
  };

  const stop = async (): Promise<void> => {
    if (!isMountedRef.current) return;
    try {
      player.pause();
      player.seekTo(0);
      setIsPlaying(false);
      setPosition(0);
    } catch (err) {
      const error = AudioPlayerError.playbackError(
        "Impossible d'arrêter la lecture",
      );
      setError(error.getUserMessage());
      console.error("Error stopping:", err);
    }
  };

  const seek = async (positionInSeconds: number): Promise<void> => {
    if (!isMountedRef.current) return;
    try {
      // Valider la position
      if (positionInSeconds < 0 || positionInSeconds > duration) {
        throw new Error("Position invalide");
      }

      player.seekTo(positionInSeconds);
      setPosition(positionInSeconds);
    } catch (err) {
      const error = AudioPlayerError.playbackError(
        "Impossible de naviguer dans le titre",
      );
      setError(error.getUserMessage());
      console.error("Error seeking:", err);
    }
  };

  const setVolume = async (newVolume: number): Promise<void> => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      player.volume = clampedVolume;
    } catch (err) {
      const error = AudioPlayerError.playbackError(
        "Impossible de régler le volume",
      );
      setError(error.getUserMessage());
      console.error("Error setting volume:", err);
    }
  };

  return {
    // State
    isPlaying,
    duration,
    position,
    currentTrack,
    volume: player.volume,
    isLoading,
    error,
    // Actions
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
  };
};
