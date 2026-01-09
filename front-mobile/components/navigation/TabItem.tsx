import React, { useEffect, useRef, type ComponentType } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  View,
} from "react-native";
import type { IconlyIconProps } from "@/components/icons/Iconly";

type Props = {
  icon: ComponentType<IconlyIconProps>;
  label: string;
  active: boolean;
  onPress: () => void;
  activeBg?: string;
  inactiveColor?: string;
};

export function TabItem({
  icon: Icon,
  label,
  active,
  onPress,
  activeBg = "#0D7377",
  inactiveColor = "#FFFFFF",
}: Props) {
  const t = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (active) {
      Animated.timing(t, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
    } else {
      t.stopAnimation(() => t.setValue(0));
    }
  }, [active, t]);

  const labelOpacity = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const labelTranslate = t.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <Animated.View
          style={[
            styles.button,
            active ? styles.activeButton : styles.inactiveButton,
            active && { backgroundColor: activeBg },
          ]}
        >
          <Icon size={24} color={inactiveColor} />

          {active && (
            <Animated.View
              style={[
                styles.labelWrap,
                {
                  opacity: labelOpacity,
                  transform: [{ translateX: labelTranslate }],
                },
              ]}
              pointerEvents="none"
            >
              <Text
                style={[styles.label, { color: inactiveColor }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    overflow: "visible", // empêche d’empiéter
    alignItems: "center",
  },

  button: {
    height: 56,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  // ✅ inactif : icône seule, largeur fixe
  inactiveButton: {
    width: 54,
    justifyContent: "center",
  },

  // ✅ actif : prend TOUTE la largeur de son conteneur (qui a un flex augmenté)
  activeButton: {
    width: "100%",
    justifyContent: "flex-start",
    paddingHorizontal: 14, // petit pour laisser de la place au texte
  },

  labelWrap: {
    marginLeft: 8,
    flexShrink: 1, // ✅ on veut éviter le "Ho..." quand on a la place
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
  },
});
