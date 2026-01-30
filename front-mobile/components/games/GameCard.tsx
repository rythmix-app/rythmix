import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Game } from "@/types/games";
import MaskedView from "@react-native-masked-view/masked-view";
import { getGameIcon } from "@/utils/games";

export interface GameCardProps {
  game: Game;
  onPress: (game: Game) => void;
  onToggleFavorite: (game: Game) => void;
}

export function GameCard({ game, onPress, onToggleFavorite }: GameCardProps) {
  const { width } = useWindowDimensions();
  const cardScale = useSharedValue(1);
  const favoriteScale = useSharedValue(1);
  const gameIcon = getGameIcon(game.name);

  const cardWidth = useMemo(() => {
    const horizontalPadding = 20 * 2; // Parent container padding
    const gutter = 12; // Gap between cards
    const available = width - horizontalPadding - gutter;
    const calculatedWidth = available / 2;
    return Math.max(calculatedWidth, 150); // Minimum 150px, no maximum limit
  }, [width]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const favoriteAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

  const handlePressIn = () => {
    cardScale.value = withSpring(0.97, { damping: 18, stiffness: 220 });
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1, { damping: 18, stiffness: 220 });
  };

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress(game);
  };

  const handleToggleFavorite = () => {
    favoriteScale.value = 1.15;
    favoriteScale.value = withSpring(1, { stiffness: 300, damping: 16 });
    Haptics.selectionAsync().catch(() => {});
    onToggleFavorite(game);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={{ width: cardWidth }}
    >
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        <View style={styles.media}>
          <View style={styles.placeholder}>
            <MaterialIcons name={gameIcon.name} size={40} color="#D8E7E7" />
          </View>
          <LinearGradient
            colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.55)"]}
            style={styles.imageOverlay}
          />

          {!game.isEnabled && (
            <View style={styles.disabledOverlay}>
              <Text style={styles.disabledText}>Bientôt</Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={handleToggleFavorite}
          hitSlop={10}
          style={[styles.favoriteButton]}
        >
          <MaskedView
            style={{ flex: 1, flexDirection: "row", top: 7, left: 7 }}
            maskElement={
              <Animated.View style={favoriteAnimatedStyle}>
                <FontAwesome
                  name={game.isFavorite ? "heart" : "heart-o"}
                  size={22}
                />
              </Animated.View>
            }
          >
            <LinearGradient
              colors={["#40D400", "#216E00", "#216E00"]}
              style={{ flex: 1 }}
            />
          </MaskedView>
        </Pressable>

        <Text numberOfLines={2} style={styles.title}>
          {game.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 164,
    aspectRatio: "1/1",
    borderRadius: 18,
    padding: 12,
    backgroundColor: "#121212",
    shadowColor: "#14FFEC",
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  media: {
    height: 94,
    width: 116,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#161c27",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledText: {
    color: "#F5A524",
    fontSize: 14,
    fontFamily: "Bold",
    textTransform: "uppercase",
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  favoriteWithBadge: {
    top: 52,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Bold",
    textAlign: "center",
  },
});
