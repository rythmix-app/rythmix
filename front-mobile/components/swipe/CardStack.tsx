import { useState } from "react";
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
}

export default function CardStack({
  cards: initialCards,
  onSwipeLeft,
  onSwipeRight,
  onEmpty,
}: CardStackProps) {
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);

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
            console.log("replay");
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
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  nopeButton: {
    borderWidth: 2,
    borderColor: "#F44336",
  },
  likeButton: {
    borderWidth: 2,
    borderColor: "#4CAF50",
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
