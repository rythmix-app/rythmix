import { useState, useEffect, useCallback, useRef } from "react";
import { deezerAPI, DeezerTrack } from "@/services/deezer-api";
import { cacheManager } from "@/services/cache-manager";
import {
  createMyLikedTrack,
  deleteMyLikedTrack,
} from "@/services/likedTrackService";
import { MusicCardData } from "@/components/swipe";
import { deezerTracksToCardData } from "@/utils/deezer-adapter";
import { useAudioPlayer } from "./useAudioPlayer";

interface UseSwipeMixOptions {
  initialLimit?: number;
}

export function useSwipeMix(options: UseSwipeMixOptions = {}) {
  const { initialLimit = 10 } = options;

  const [cards, setCards] = useState<MusicCardData[]>([]);
  const [tracks, setTracks] = useState<Map<string, DeezerTrack>>(new Map());
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);

  // Utiliser useRef pour l'index de pagination pour éviter de recréer les callbacks
  const currentPageIndexRef = useRef(0);
  // Verrou synchrone pour éviter les appels concurrents à loadTracks
  const isLoadingRef = useRef(false);
  // Tracks likés persistés en DB — utilisé pour rollback sur un dislike qui suit un like
  const likedTrackIdsRef = useRef<Set<string>>(new Set());

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

        // Récupérer les morceaux tendances
        const response = await deezerAPI.getTopTracks(initialLimit, indexToUse);

        // Récupérer les genres et les détails des albums (pour avoir le genre_id) en parallèle
        // Note: deezerAPI utilise déjà le cacheManager
        const [genresResponse, ...albums] = await Promise.all([
          deezerAPI.getGenres(),
          ...response.data.map((track) => deezerAPI.getAlbum(track.album.id)),
        ]);

        // Créer les mappings pour l'adapter
        const genreMapping: Record<number, string> = {};
        genresResponse.data.forEach((genre) => {
          genreMapping[genre.id] = genre.name.toUpperCase();
        });

        const albumGenresMapping: Record<number, string[]> = {};
        albums.forEach((album) => {
          if (album) {
            // Si l'album a une liste de genres, on les récupère tous
            if (album.genres && album.genres.data.length > 0) {
              albumGenresMapping[album.id] = album.genres.data.map((g) =>
                g.name.toUpperCase(),
              );
            } else if (album.genre_id && genreMapping[album.genre_id]) {
              // Fallback sur le genre_id principal si la liste est absente
              albumGenresMapping[album.id] = [genreMapping[album.genre_id]];
            }
          }
        });

        // Convertir en cartes avec les informations de genre
        const newCards = deezerTracksToCardData(
          response.data,
          genreMapping,
          albumGenresMapping,
        );

        // Vérifier s'il y a encore des musiques à charger
        setHasMoreTracks(response.data.length === initialLimit);

        if (append) {
          // Ajouter les nouvelles cartes à la fin
          setCards((prev) => [...prev, ...newCards]);

          // Ajouter les nouvelles tracks à la map existante
          setTracks((prev) => {
            const newMap = new Map(prev);
            response.data.forEach((track) => {
              newMap.set(track.id.toString(), track);
            });
            return newMap;
          });

          // Incrémenter l'index pour la prochaine page
          currentPageIndexRef.current += initialLimit;
        } else {
          // Remplacer complètement les cartes et tracks
          const trackMap = new Map<string, DeezerTrack>();
          response.data.forEach((track) => {
            trackMap.set(track.id.toString(), track);
          });

          setCards(newCards);
          setTracks(trackMap);
          currentPageIndexRef.current = initialLimit;
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des musiques",
        );
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

  // Handler pour swipe left (skip/dislike)
  const handleSwipeLeft = useCallback(
    (card: MusicCardData) => {
      // Rollback d'un like précédent si l'utilisateur change d'avis via le bouton précédent
      if (likedTrackIdsRef.current.has(card.id)) {
        likedTrackIdsRef.current.delete(card.id);
        deleteMyLikedTrack(card.id).catch(() => {
          // Erreurs réseau ignorées silencieusement
        });
      }

      // Arrêter la lecture si c'est le morceau actuel
      if (audioPlayer.currentTrack?.id.toString() === card.id) {
        audioPlayer.stop();
      }
    },
    [audioPlayer],
  );

  // Handler pour swipe right (like/save)
  const handleSwipeRight = useCallback(
    async (card: MusicCardData) => {
      // Persister le like en arrière-plan sans bloquer l'UX
      likedTrackIdsRef.current.add(card.id);
      createMyLikedTrack({
        deezerTrackId: card.id,
        title: card.title,
        artist: card.artist,
        type: "track",
      }).catch(() => {
        // Erreurs réseau et 409 (déjà liké) ignorées silencieusement
        likedTrackIdsRef.current.delete(card.id);
      });

      // Arrêter la lecture pour passer à la carte suivante
      // (la nouvelle carte démarrera automatiquement via onCardAppear)
      if (audioPlayer.currentTrack?.id.toString() === card.id) {
        audioPlayer.stop();
      }
    },
    [audioPlayer],
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
