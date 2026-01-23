import { StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import MusicCard, { MusicCardData } from "./MusicCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SWIPE_CONFIG = {
  threshold: 120,
  rotationFactor: 0.15,
  velocityThreshold: 0.5,
  springConfig: {
    damping: 15,
    stiffness: 100,
    mass: 1,
  },
  swipeAnimationDuration: 350,
  snapBackDuration: 250,
};

interface SwipeCardProps {
  data: MusicCardData;
  onSwipeLeft?: (data: MusicCardData) => void;
  onSwipeRight?: (data: MusicCardData) => void;
  isTop?: boolean;
  index?: number;
  isPlaying?: boolean;
  onTogglePlay?: (data: MusicCardData) => void;
}

export default function SwipeCard({
  data,
  onSwipeLeft,
  onSwipeRight,
  isTop = false,
  index = 0,
  isPlaying = false,
  onTogglePlay,
}: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const isSwipingHorizontal = useSharedValue(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (!isSwipingHorizontal.value && Math.abs(event.translationX) > 10) {
        isSwipingHorizontal.value = true;
      }

      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY * 0.2;

      if (
        Math.abs(translateX.value) > SWIPE_CONFIG.threshold &&
        Math.abs(startX.value) < SWIPE_CONFIG.threshold
      ) {
        runOnJS(triggerHaptic)();
      }
    })
    .onEnd((event) => {
      const shouldSwipe =
        Math.abs(translateX.value) > SWIPE_CONFIG.threshold ||
        Math.abs(event.velocityX) > SWIPE_CONFIG.velocityThreshold * 1000;

      if (shouldSwipe) {
        const direction = translateX.value > 0 ? 1 : -1;
        translateX.value = withTiming(
          direction * SCREEN_WIDTH * 1.5,
          { duration: SWIPE_CONFIG.swipeAnimationDuration },
          () => {
            if (direction > 0 && onSwipeRight) {
              runOnJS(onSwipeRight)(data);
            } else if (direction < 0 && onSwipeLeft) {
              runOnJS(onSwipeLeft)(data);
            }
          },
        );
        translateY.value = withTiming(event.velocityY * 0.1, {
          duration: SWIPE_CONFIG.swipeAnimationDuration,
        });
      } else {
        translateX.value = withSpring(0, SWIPE_CONFIG.springConfig);
        translateY.value = withSpring(0, SWIPE_CONFIG.springConfig);
      }

      isSwipingHorizontal.value = false;
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
    );

    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.8],
      [1, 0],
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
      opacity,
    };
  });

  const likeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_CONFIG.threshold],
      [0, 1],
      "clamp",
    );

    const scale = interpolate(
      translateX.value,
      [0, SWIPE_CONFIG.threshold, SWIPE_CONFIG.threshold + 50],
      [0.8, 1, 1.1],
      "clamp",
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const nopeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_CONFIG.threshold, 0],
      [1, 0],
      "clamp",
    );

    const scale = interpolate(
      translateX.value,
      [-SWIPE_CONFIG.threshold - 50, -SWIPE_CONFIG.threshold, 0],
      [1.1, 1, 0.8],
      "clamp",
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const AnimatedView = (
    <Animated.View
      style={[
        styles.cardContainer,
        isTop ? cardAnimatedStyle : {},
        { zIndex: 100 - index },
      ]}
    >
      <MusicCard
        data={data}
        isPlaying={isPlaying}
        onTogglePlay={() => onTogglePlay?.(data)}
      />

      {isTop && (
        <>
          <Animated.View style={[styles.overlayLike, likeOverlayStyle]}>
            <Animated.Text style={styles.overlayText}>LIKE</Animated.Text>
          </Animated.View>

          <Animated.View style={[styles.overlayNope, nopeOverlayStyle]}>
            <Animated.Text style={styles.overlayText}>NOPE</Animated.Text>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );

  if (!isTop) {
    return AnimatedView;
  }

  return <GestureDetector gesture={panGesture}>{AnimatedView}</GestureDetector>;
}

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    width: 320,
    height: 400,
  },
  overlayLike: {
    position: "absolute",
    top: 50,
    right: 30,
    transform: [{ rotate: "20deg" }],
    borderWidth: 4,
    borderColor: "#4CAF50",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  overlayNope: {
    position: "absolute",
    top: 50,
    left: 30,
    transform: [{ rotate: "-20deg" }],
    borderWidth: 4,
    borderColor: "#F44336",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  overlayText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
