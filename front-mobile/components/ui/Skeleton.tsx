import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

const SKELETON_BASE = "rgba(255, 255, 255, 0.06)";
const SKELETON_HIGHLIGHT = "rgba(255, 255, 255, 0.12)";
const BACKGROUND_COLOR = "#121212";

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false,
    );
  }, [shimmerProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerProgress.value, [0, 1], [-150, 150]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      style={[
        styles.base,
        { width, height, borderRadius, backgroundColor: BACKGROUND_COLOR },
        style,
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: SKELETON_BASE, borderRadius },
        ]}
      />
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={["transparent", SKELETON_HIGHLIGHT, "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

export const SkeletonCircle: React.FC<Omit<SkeletonProps, "borderRadius">> = ({
  width = 50,
  height = 50,
  style,
}) => {
  const size = (typeof width === "number" ? width : 50) as number;
  return (
    <Skeleton
      width={width}
      height={height || width}
      borderRadius={size / 2}
      style={style}
    />
  );
};

export const SkeletonSquare: React.FC<SkeletonProps> = ({
  width = 100,
  height = 100,
  style,
}) => (
  <Skeleton
    width={width}
    height={height || width}
    borderRadius={8}
    style={style}
  />
);

export const SkeletonRectangle: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 150,
  style,
}) => <Skeleton width={width} height={height} borderRadius={8} style={style} />;

export const SkeletonLine: React.FC<Omit<SkeletonProps, "height">> = ({
  width = "100%",
  style,
}) => <Skeleton width={width} height={14} borderRadius={4} style={style} />;

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
