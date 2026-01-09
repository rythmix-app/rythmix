import React, { useEffect, useRef } from "react";
import { TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  active: boolean;
  onPress: () => void;
  bgColor?: string;
  borderColor?: string;
  iconColor?: string;
};

export function CentralTabItem({
  active,
  onPress,
  bgColor = "#0D7377",
  borderColor = "#FFFFFF",
  iconColor = "#FFFFFF",
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: active ? 1.05 : 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 10,
      }),
      Animated.spring(lift, {
        toValue: active ? -2 : 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 10,
      }),
    ]).start();
  }, [active, lift, scale]);

  return (
    <Animated.View style={{ transform: [{ translateY: lift }, { scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[
          styles.button,
          { backgroundColor: bgColor, borderColor: borderColor },
        ]}
      >
        <Ionicons name="game-controller" size={26} color={iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginTop: -32, // surélevé (effet maquette)
  },
});
