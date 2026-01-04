import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import SwipeCard from "./SwipeCard";
import { MusicCardData } from "./MusicCard";
import SwipeButton from "@/components/swipe/SwipeButton";

interface CardStackProps {
  cards: MusicCardData[];
  onSwipeLeft?: (card: MusicCardData) => void;
  onSwipeRight?: (card: MusicCardData) => void;
  onEmpty?: () => void;
  onLoadMore?: () => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onTogglePlay?: (card: MusicCardData) => void;
  onCardAppear?: (card: MusicCardData) => void;
}

export default function CardStack({
  cards: initialCards,
  onSwipeLeft,
  onSwipeRight,
  onEmpty,
  onLoadMore,
  currentTrackId,
  isPlaying = false,
  onTogglePlay,
  onCardAppear,
}: CardStackProps) {
  const cards = initialCards;
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastPlayedCardIdRef = useRef<string | null>(null);
  const hasLoadedMoreRef = useRef(false);
  const onLoadMoreRef = useRef(onLoadMore);

  // Mettre à jour la référence quand onLoadMore change
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Jouer la musique automatiquement quand une nouvelle carte apparaît
  useEffect(() => {
    const currentCard = cards[currentIndex];

    // Ne lancer la musique que si c'est une nouvelle carte différente de la dernière jouée
    if (
      currentCard &&
      onCardAppear &&
      currentCard.id !== lastPlayedCardIdRef.current
    ) {
      console.log(
        "CardStack: New card detected, calling onCardAppear for:",
        currentCard.id,
      );
      lastPlayedCardIdRef.current = currentCard.id;
      onCardAppear(currentCard);
    }
  }, [currentIndex, cards.length, onCardAppear, cards]); // Déclenche quand l'index change OU quand de nouvelles cartes sont chargées

  // Charger automatiquement plus de musiques quand on approche de la fin
  useEffect(() => {
    const cardsRemaining = cards.length - currentIndex;
    const LOAD_MORE_THRESHOLD = 5; // Charger plus quand il reste 5 cartes

    if (
      cardsRemaining <= LOAD_MORE_THRESHOLD &&
      cardsRemaining > 0 &&
      onLoadMoreRef.current &&
      !hasLoadedMoreRef.current
    ) {
      console.log(
        `CardStack: Only ${cardsRemaining} cards remaining, loading more...`,
      );
      hasLoadedMoreRef.current = true;
      onLoadMoreRef.current();
    }

    // Réinitialiser le flag quand de nouvelles cartes sont chargées
    if (cardsRemaining > LOAD_MORE_THRESHOLD) {
      hasLoadedMoreRef.current = false;
    }
  }, [currentIndex, cards.length]); // Ne plus mettre onLoadMore dans les dépendances

  const handleSwipeLeft = (card: MusicCardData) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSwipeLeft?.(card);

    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= cards.length) {
        onEmpty?.();
      }
      return nextIndex;
    });
  };

  const handleSwipeRight = (card: MusicCardData) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSwipeRight?.(card);

    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= cards.length) {
        onEmpty?.();
      }
      return nextIndex;
    });
  };

  const handleReload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    lastPlayedCardIdRef.current = null; // Reset pour permettre de rejouer la première carte
    setCurrentIndex(0);
  };

  const visibleCards = cards.slice(currentIndex, currentIndex + 3);

  if (currentIndex >= cards.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="musical-notes" size={64} color="#666" />
        <Text style={styles.emptyText}>Plus de musiques</Text>
        <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
          <Ionicons name="reload" size={24} color="#FFFFFF" />
          <Text style={styles.reloadText}>Recharger</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardsContainer}>
        {[...visibleCards].reverse().map((card, index) => {
          const actualIndex = visibleCards.length - 1 - index;
          const isTop = index === visibleCards.length - 1;

          return (
            <SwipeCard
              key={card.id}
              data={card}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              isTop={isTop}
              index={actualIndex}
              isPlaying={isTop && currentTrackId === card.id && isPlaying}
              onTogglePlay={onTogglePlay}
            />
          );
        })}
      </View>

      <View style={styles.actionsContainer}>
        <SwipeButton
          type={"dislike"}
          onPress={() => {
            const currentCard = cards[currentIndex];
            if (currentCard) {
              handleSwipeLeft(currentCard);
            }
          }}
        />
        <SwipeButton
          type={"replay"}
          onPress={() => {
            // TODO: Implement replay functionality (e.g., show the previous card again)
          }}
          size={"small"}
        />
        <SwipeButton
          type={"like"}
          onPress={() => {
            const currentCard = cards[currentIndex];
            if (currentCard) {
              handleSwipeRight(currentCard);
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardsContainer: {
    width: 320,
    height: 400,
    position: "relative",
  },
  actionsContainer: {
    flexDirection: "row",
    marginTop: 30,
    gap: 30,
    alignItems: "center",
    justifyContent: "center",
    width: 320,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 20,
    color: "#FFFFFF",
    opacity: 0.7,
  },
  reloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#19B3BD",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  reloadText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
