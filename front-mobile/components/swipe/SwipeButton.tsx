import MaskedView from "@react-native-masked-view/masked-view";
import {
  Entypo,
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

type SwipeButtonProps = {
  type: "like" | "dislike" | "replay";
  size?: "medium" | "small";
  onPress?: () => void;
};

const SIZES = {
  medium: {
    container: 80,
    icon: 40,
  },
  small: {
    container: 70,
    icon: 28,
  },
};

const GRADIENTS: Record<SwipeButtonProps["type"], [string, string]> = {
  like: ["#40D400", "#216E00"],
  dislike: ["#D40000", "#6E0000"],
  replay: ["#0D7377", "#18D6DD"],
};

const BORDER = {
  like: "#40D400",
  dislike: "#D40000",
  replay: "#18D6DD",
};

const ICONS = {
  like: ({ size }: { size: number }) => (
    <FontAwesome name="heart" size={size} />
  ),
  dislike: ({ size }: { size: number }) => <Entypo name="cross" size={size} />,
  replay: ({ size }: { size: number }) => (
    <MaterialCommunityIcons name="replay" size={size} />
  ),
};

const SwipeButton: React.FC<SwipeButtonProps> = ({
  type,
  size = "medium",
  onPress,
}) => {
  const dimensions = SIZES[size];
  const gradientColors = GRADIENTS[type];
  const Icon = ICONS[type];
  const borderColor = BORDER[type];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          width: dimensions.container,
          height: dimensions.container,
          borderRadius: dimensions.container / 2,
          borderColor: borderColor,
          borderWidth: 2,
        },
        pressed && styles.pressed,
      ]}
    >
      <MaskedView
        style={{
          width: "100%",
          height: "100%",
        }}
        maskElement={
          <View style={styles.iconMask}>
            <Icon size={dimensions.icon} />
          </View>
        }
      >
        <LinearGradient
          colors={gradientColors}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </MaskedView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  iconMask: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SwipeButton;
