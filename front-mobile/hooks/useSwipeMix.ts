import { useState, useEffect, useCallback, useRef } from "react";
import { deezerAPI, DeezerTrack } from "@/services/deezer-api";
import { MusicCardData } from "@/components/swipe";
import { deezerTracksToCardData } from "@/utils/deezer-adapter";
import { useAudioPlayer } from "./useAudioPlayer";

interface UseSwipeMixOptions {
  initialLimit?: number;
  autoPlayOnSwipe?: boolean;
}

export function useSwipeMix(options: UseSwipeMixOptions = {}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initialLimit = 10, autoPlayOnSwipe: _autoPlayOnSwipe = false } =
    options;

  const [cards, setCards] = useState<MusicCardData[]>([]);
  const [tracks, setTracks] = useState<Map<string, DeezerTrack>>(new Map());
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);

  // Utiliser useRef pour l'index de pagination pour éviter de recréer les callbacks
  const currentPageIndexRef = useRef(0);

  const audioPlayer = useAudioPlayer();

  // Charger les musiques initiales
  const loadTracks = useCallback(
    async (append: boolean = false) => {
      setIsLoadingCards(true);
      setError(null);

      try {
        // Utiliser l'index actuel pour la pagination
        const indexToUse = append ? currentPageIndexRef.current : 0;

        console.log(
          "loadTracks: Loading with index:",
          indexToUse,
          "append:",
          append,
        );

        // Récupérer les morceaux tendances
        const response = await deezerAPI.getTopTracks(initialLimit, indexToUse);

        console.log("loadTracks: Received", response.data.length, "tracks");

        // Convertir en cartes
        const newCards = deezerTracksToCardData(response.data);

        // Vérifier s'il y a encore des musiques à charger
        setHasMoreTracks(response.data.length === initialLimit);

        if (append) {
          // Ajouter les nouvelles cartes à la fin
          setCards((prev) => {
            console.log(
              "loadTracks: Appending",
              newCards.length,
              "cards to",
              prev.length,
              "existing cards",
            );
            return [...prev, ...newCards];
          });

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
          console.log(
            "loadTracks: Updated currentPageIndex to",
            currentPageIndexRef.current,
          );
        } else {
          // Remplacer complètement les cartes et tracks
          const trackMap = new Map<string, DeezerTrack>();
          response.data.forEach((track) => {
            trackMap.set(track.id.toString(), track);
          });

          setCards(newCards);
          setTracks(trackMap);
          currentPageIndexRef.current = initialLimit;
          console.log(
            "loadTracks: Initial load, set currentPageIndex to",
            currentPageIndexRef.current,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des musiques",
        );
        console.error("Error loading tracks:", err);
      } finally {
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
      console.log("Swiped left:", card.title);

      // TODO: Enregistrer le dislike dans le backend
      // TODO: Utiliser pour améliorer les recommandations

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
      console.log("Swiped right:", card.title);

      // TODO: Enregistrer le like dans le backend
      // TODO: Ajouter à la playlist de l'utilisateur

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
    console.log("No more cards, reloading...");
    loadTracks();
  }, [loadTracks]);

  // Fonction pour charger plus de musiques (pagination)
  const loadMore = useCallback(async () => {
    console.log(
      "loadMore called, isLoadingCards:",
      isLoadingCards,
      "hasMoreTracks:",
      hasMoreTracks,
    );
    if (isLoadingCards || !hasMoreTracks) {
      console.log("loadMore blocked:", { isLoadingCards, hasMoreTracks });
      return;
    }
    console.log(
      "loadMore: Loading more tracks with currentPageIndex:",
      currentPageIndexRef.current,
    );
    await loadTracks(true);
  }, [isLoadingCards, hasMoreTracks, loadTracks]);

  // Handler appelé quand une nouvelle carte apparaît
  const handleCardAppear = useCallback(
    async (card: MusicCardData) => {
      // Ne pas rejouer si c'est déjà la carte en cours
      if (audioPlayer.currentTrack?.id.toString() === card.id) {
        console.log("Card already playing, skipping:", card.id);
        return;
      }

      const track = tracks.get(card.id);
      if (track) {
        console.log("Playing new card:", card.id, track.title);
        await audioPlayer.play(track);
      } else {
        console.warn("Track not found for card:", card.id);
      }
    },
    [tracks, audioPlayer],
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
