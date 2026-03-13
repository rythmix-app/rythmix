import { useCallback, useRef, useState } from "react";
import { Animated } from "react-native";

export function useErrorFeedback(enabled: boolean = true) {
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const borderOpacity = useRef(new Animated.Value(0)).current;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerError = useCallback(
    (message?: string) => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }

      if (message) {
        setErrorMessage(message);
        errorTimerRef.current = setTimeout(() => setErrorMessage(null), 1500);
      }

      if (!enabled) return;

      shakeAnimation.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      borderOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(borderOpacity, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [enabled, shakeAnimation, borderOpacity],
  );

  return { shakeAnimation, borderOpacity, errorMessage, triggerError };
}
