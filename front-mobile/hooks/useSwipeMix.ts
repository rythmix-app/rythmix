import { useState, useEffect, useCallback, useRef } from "react";
import { deezerAPI, DeezerTrack } from "@/services/deezer-api";
import { cacheManager } from "@/services/cache-manager";
import { getSwipemixFeed } from "@/services/swipemixFeedService";
import { upsertMyTrackInteraction } from "@/services/trackInteractionsService";
import {
  InteractionAction,
  SpotifyTriggerSnapshot,
} from "@/types/trackInteraction";
import { ApiError } from "@/types/auth";
import { MusicCardData } from "@/components/swipe";
import { deezerTracksToCardData } from "@/utils/deezer-adapter";
import { useAudioPlayer } from "./useAudioPlayer";

const buildGenreMappings = async (
  feedTracks: DeezerTrack[],
): Promise<{
  genreMapping: Record<number, string>;
  albumGenresMapping: Record<number, string[]>;
}> => {
  const genreMapping: Record<number, string> = {};
  const albumGenresMapping: Record<number, string[]> = {};

  // L'enrichissement de genres est best-effort : si Deezer rate-limit (réponse
  // 200 OK avec body { error: ... }), on affiche les cartes sans tags plutôt
  // que de bloquer tout le SwipeMix.
  const [genresResult, ...albumsResult] = await Promise.allSettled([
    deezerAPI.getGenres(),
    ...feedTracks.map((track) => deezerAPI.getAlbum(track.album.id)),
  ]);

  if (genresResult.status === "fulfilled" && genresResult.value?.data) {
    genresResult.value.data.forEach((genre) => {
      genreMapping[genre.id] = genre.name.toUpperCase();
    });
  }

  albumsResult.forEach((result) => {
    if (result.status !== "fulfilled") return;
    const album = result.value;
    if (!album) return;
    if (album.genres && album.genres.data?.length > 0) {
      albumGenresMapping[album.id] = album.genres.data.map((g) =>
        g.name.toUpperCase(),
      );
    } else if (album.genre_id && genreMapping[album.genre_id]) {
      albumGenresMapping[album.id] = [genreMapping[album.genre_id]];
    }
  });

  return { genreMapping, albumGenresMapping };
};

const getApiErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const status = (error as ApiError).statusCode;
  return typeof status === "number" ? status : undefined;
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Erreur lors du chargement des musiques";
};

const shouldFallbackToDeezer = (error: unknown): boolean => {
  const status = getApiErrorStatus(error);
  return status === undefined || status >= 500;
};

const fetchFeedWithFallback = async (
  limit: number,
  offset: number,
): Promise<DeezerTrack[]> => {
  try {
    const tracks = await getSwipemixFeed(limit, offset);
    if (tracks.length > 0) return tracks;
  } catch (error) {
    if (!shouldFallbackToDeezer(error)) throw error;
  }
  const response = await deezerAPI.getTopTracks(limit, offset);
  return response.data;
};

interface UseSwipeMixOptions {
  initialLimit?: number;
  onInteractionAttempt?: (action: InteractionAction) => void;
  onSpotifyResult?: (result: SpotifyTriggerSnapshot | undefined) => void;
}

export function useSwipeMix(options: UseSwipeMixOptions = {}) {
  const { initialLimit = 10, onInteractionAttempt, onSpotifyResult } = options;

  const [cards, setCards] = useState<MusicCardData[]>([]);
  const [tracks, setTracks] = useState<Map<string, DeezerTrack>>(new Map());
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);

  // Utiliser useRef pour l'index de pagination pour éviter de recréer les callbacks
  const currentPageIndexRef = useRef(0);
  // Verrou synchrone pour éviter les appels concurrents à loadTracks
  const isLoadingRef = useRef(false);

  const handleRetry = useCallback(
    async (track: DeezerTrack): Promise<DeezerTrack | null> => {
      try {
        await cacheManager.remove(`track:${track.id}`);
        const freshTrack = await deezerAPI.getTrack(track.id);
        setTracks((prev) => {
          const newMap = new Map(prev);
          newMap.set(freshTrack.id.toString(), freshTrack);
          return newMap;
        });
        return freshTrack;
      } catch {
        return null;
      }
    },
    [],
  );

  const audioPlayer = useAudioPlayer({ onRetry: handleRetry });

  // Charger les musiques initiales
  const loadTracks = useCallback(
    async (append: boolean = false) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoadingCards(true);
      setError(null);

      try {
        // Utiliser l'index actuel pour la pagination
        const indexToUse = append ? currentPageIndexRef.current : 0;

        // Récupérer le feed personnalisé (avec fallback sur le top Deezer en cas d'erreur backend)
        const feedTracks = await fetchFeedWithFallback(
          initialLimit,
          indexToUse,
        );

        const { genreMapping, albumGenresMapping } =
          await buildGenreMappings(feedTracks);

        // Convertir en cartes avec les informations de genre
        const newCards = deezerTracksToCardData(
          feedTracks,
          genreMapping,
          albumGenresMapping,
        );

        // Vérifier s'il y a encore des musiques à charger
        setHasMoreTracks(feedTracks.length === initialLimit);

        if (append) {
          // Ajouter les nouvelles cartes à la fin
          setCards((prev) => [...prev, ...newCards]);

          // Ajouter les nouvelles tracks à la map existante
          setTracks((prev) => {
            const newMap = new Map(prev);
            feedTracks.forEach((track) => {
              newMap.set(track.id.toString(), track);
            });
            return newMap;
          });

          // Incrémenter l'index pour la prochaine page
          currentPageIndexRef.current += initialLimit;
        } else {
          // Remplacer complètement les cartes et tracks
          const trackMap = new Map<string, DeezerTrack>();
          feedTracks.forEach((track) => {
            trackMap.set(track.id.toString(), track);
          });

          setCards(newCards);
          setTracks(trackMap);
          currentPageIndexRef.current = initialLimit;
        }
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        isLoadingRef.current = false;
        setIsLoadingCards(false);
      }
    },
    [initialLimit],
  );

  // Charger au montage
  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const persistInteraction = useCallback(
    async (card: MusicCardData, action: InteractionAction) => {
      const cached = tracks.get(card.id);

      // /chart ne retourne pas l'ISRC : on tente un backfill asynchrone pour les prochaines
      // interactions sans bloquer le swipe courant.
      if (cached?.isrc === undefined) {
        void deezerAPI
          .getTrack(Number(card.id))
          .then((freshTrack) => {
            setTracks((prev) => {
              const current = prev.get(card.id);
              if (current?.isrc === freshTrack.isrc) {
                return prev;
              }
              const newMap = new Map(prev);
              newMap.set(freshTrack.id.toString(), freshTrack);
              return newMap;
            });
          })
          .catch(() => {
            // Best effort : ne pas impacter la persistance de l'interaction
          });
      }

      onInteractionAttempt?.(action);

      try {
        const response = await upsertMyTrackInteraction({
          deezerTrackId: card.id,
          deezerArtistId: cached ? String(cached.artist.id) : undefined,
          action,
          title: card.title,
          artist: card.artist,
          isrc: cached?.isrc,
        });
        onSpotifyResult?.(response.spotifyResult);
      } catch {
        // Les échecs ne sont pas mis en file d'attente : l'interaction peut être perdue
        // en cas d'erreur réseau.
      }
    },
    [tracks, onInteractionAttempt, onSpotifyResult],
  );

  // Handler pour swipe left (skip/dislike)
  const handleSwipeLeft = useCallback(
    (card: MusicCardData) => {
      persistInteraction(card, "disliked");

      // Arrêter la lecture si c'est le morceau actuel
      if (audioPlayer.currentTrack?.id.toString() === card.id) {
        audioPlayer.stop();
      }
    },
    [audioPlayer, persistInteraction],
  );

  // Handler pour swipe right (like/save)
  const handleSwipeRight = useCallback(
    (card: MusicCardData) => {
      persistInteraction(card, "liked");

      // Arrêter la lecture pour passer à la carte suivante
      // (la nouvelle carte démarrera automatiquement via onCardAppear)
      if (audioPlayer.currentTrack?.id.toString() === card.id) {
        audioPlayer.stop();
      }
    },
    [audioPlayer, persistInteraction],
  );

  // Handler pour play/pause
  const handleTogglePlay = useCallback(
    async (card: MusicCardData) => {
      const isCurrentTrack =
        audioPlayer.currentTrack?.id.toString() === card.id;

      if (isCurrentTrack) {
        if (audioPlayer.isPlaying) {
          await audioPlayer.pause();
        } else {
          await audioPlayer.resume();
        }
      } else {
        const track = tracks.get(card.id);
        if (track) {
          await audioPlayer.play(track);
        }
      }
    },
    [audioPlayer, tracks],
  );

  // Handler quand il n'y a plus de cartes
  const handleEmpty = useCallback(() => {
    if (isLoadingRef.current) return;
    loadTracks();
  }, [loadTracks]);

  // Fonction pour charger plus de musiques (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreTracks) return;
    await loadTracks(true);
  }, [hasMoreTracks, loadTracks]);

  // Handler appelé quand une nouvelle carte apparaît
  const handleCardAppear = useCallback(
    async (card: MusicCardData) => {
      // Ne pas rejouer si c'est déjà la carte en cours
      if (audioPlayer.currentTrack?.id.toString() === card.id) {
        return;
      }

      const track = tracks.get(card.id);
      if (track) {
        await audioPlayer.play(track);
        return;
      }

      // Track absente de la map — tenter un refetch individuel
      try {
        const fetchedTrack = await deezerAPI.getTrack(Number(card.id));
        if (fetchedTrack) {
          setTracks((prev) => {
            const newMap = new Map(prev);
            newMap.set(fetchedTrack.id.toString(), fetchedTrack);
            return newMap;
          });
          await audioPlayer.play(fetchedTrack);
        }
      } catch {
        // Refetch échoué — recharger le lot complet
        await loadTracks();
      }
    },
    [tracks, audioPlayer, loadTracks],
  );

  return {
    cards,
    isLoadingCards,
    error,
    audioPlayer,
    handlers: {
      onSwipeLeft: handleSwipeLeft,
      onSwipeRight: handleSwipeRight,
      onTogglePlay: handleTogglePlay,
      onEmpty: handleEmpty,
      onCardAppear: handleCardAppear,
    },
    actions: {
      reload: loadTracks,
      loadMore,
    },
  };
}
