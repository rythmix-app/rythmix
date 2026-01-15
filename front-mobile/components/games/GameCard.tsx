import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export interface GameCardProps {
  id: string;
  title: string;
  image: string;
  isFavorite: boolean;
  badge?: "new" | "soon" | "popular";
  playerMode: "solo" | "multi" | "both";
  onPress: () => void;
  onToggleFavorite: (id: string) => void;
}

const badgeLabels: Record<NonNullable<GameCardProps["badge"]>, string> = {
  new: "Nouveau",
  soon: "Bientôt",
  popular: "Populaire",
};

const badgeColors: Record<NonNullable<GameCardProps["badge"]>, string> = {
  new: "#14FFEC",
  soon: "#F5A524",
  popular: "#FF5470",
};

const playerMeta: Record<
  GameCardProps["playerMode"],
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string }
> = {
  solo: {
    icon: "person",
    label: "Solo",
    color: "#14FFEC",
    bg: "rgba(20, 255, 236, 0.12)",
  },
  multi: {
    icon: "people",
    label: "Multi",
    color: "#7AD7F0",
    bg: "rgba(122, 215, 240, 0.16)",
  },
  both: {
    icon: "people-outline",
    label: "Solo & Multi",
    color: "#9B8CFF",
    bg: "rgba(155, 140, 255, 0.14)",
  },
};

export function GameCard({
  id,
  title,
  image,
  isFavorite,
  badge,
  playerMode,
  onPress,
  onToggleFavorite,
}: GameCardProps) {
  const { width } = useWindowDimensions();
  const [hovered, setHovered] = useState(false);
  const cardScale = useSharedValue(1);
  const favoriteScale = useSharedValue(1);

  const cardWidth = useMemo(() => {
    const horizontalPadding = 16 * 2;
    const gutter = 12;
    const available = width - horizontalPadding - gutter;
    return Math.min(Math.max(available / 2, 150), 200);
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
    onPress();
  };

  const handleToggleFavorite = () => {
    favoriteScale.value = 1.15;
    favoriteScale.value = withSpring(1, { stiffness: 300, damping: 16 });
    Haptics.selectionAsync().catch(() => {});
    onToggleFavorite(id);
  };

  const hasImage = Boolean(image);
  const player = playerMeta[playerMode];

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{ width: cardWidth }}
    >
      <Animated.View
        style={[
          styles.card,
          hovered && styles.cardHovered,
          cardAnimatedStyle,
        ]}
      >
        <LinearGradient
          colors={["#111927", "#0B1018"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.media}>
            {hasImage ? (
              <Image
                source={{ uri: image }}
                style={styles.image}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="help" size={40} color="#D8E7E7" />
              </View>
            )}
            <LinearGradient
              colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.55)"]}
              style={styles.imageOverlay}
            />

            {badge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: badgeColors[badge] },
                ]}
              >
                <Text style={styles.badgeText}>{badgeLabels[badge]}</Text>
              </View>
            )}

            <Pressable
              onPress={handleToggleFavorite}
              hitSlop={10}
              style={[styles.favoriteButton, badge && styles.favoriteWithBadge]}
            >
              <Animated.View style={favoriteAnimatedStyle}>
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite ? "#14FFEC" : "#FFFFFF"}
                />
              </Animated.View>
            </Pressable>

            <View style={[styles.playerBadge, { backgroundColor: player.bg }]}>
              <Ionicons name={player.icon} size={14} color={player.color} />
              <Text style={[styles.playerBadgeText, { color: player.color }]}>
                {player.label}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text numberOfLines={2} style={styles.title}>
              {title}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 210,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0E121B",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardHovered: {
    shadowOpacity: 0.45,
    elevation: 10,
  },
  gradient: {
    flex: 1,
  },
  media: {
    height: 130,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#161c27",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: "#0B1018",
    fontSize: 11,
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
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteWithBadge: {
    top: 52,
  },
  playerBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  playerBadgeText: {
    fontSize: 12,
    fontFamily: "Medium",
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Bold",
  },
});
