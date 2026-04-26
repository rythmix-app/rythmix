import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToastType = "success" | "warning" | "error";

export interface ToastOptions {
  message: string;
  type: ToastType;
  /** Duration in ms before auto-dismiss. Defaults to 3000. */
  duration?: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

interface ToastState extends ToastOptions {
  id: number;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const TOAST_CONFIG = {
  success: {
    accent: "#40D400",
    bg: "rgba(10, 26, 5, 0.97)",
    label: "Succès",
  },
  warning: {
    accent: "#F0A500",
    bg: "rgba(28, 20, 3, 0.97)",
    label: "Attention",
  },
  error: {
    accent: "#D40000",
    bg: "rgba(26, 5, 5, 0.97)",
    label: "Erreur",
  },
} as const;

// ─── Icons ───────────────────────────────────────────────────────────────────

const SuccessIcon = ({ color }: Readonly<{ color: string }>) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
    <Path
      d="M8 12.5l2.5 2.5 5.5-6"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const WarningIcon = ({ color }: Readonly<{ color: string }>) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M12 9v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Circle
      cx="12"
      cy="17"
      r="0.5"
      fill={color}
      stroke={color}
      strokeWidth="1"
    />
  </Svg>
);

const ErrorIcon = ({ color }: Readonly<{ color: string }>) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
    <Path
      d="M15 9l-6 6M9 9l6 6"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);

const ICONS = {
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
};

// ─── Toast Display ────────────────────────────────────────────────────────────

function ToastDisplay({
  toast,
  onDismiss,
}: Readonly<{
  toast: ToastState;
  onDismiss: () => void;
}>) {
  const insets = useSafeAreaInsets();
  const duration = toast.duration ?? 5000;
  const config = TOAST_CONFIG[toast.type];
  const Icon = ICONS[toast.type];

  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const progressWidth = useSharedValue(1);

  const triggerDismiss = useCallback(() => {
    translateY.value = withTiming(-100, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    });
    opacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    });
    setTimeout(onDismiss, 320);
  }, [onDismiss, opacity, translateY]);

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    progressWidth.value = withTiming(0, { duration });

    const timer = setTimeout(triggerDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, opacity, progressWidth, toast.id, translateY, triggerDismiss]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as `${number}%`,
  }));

  return (
    <Animated.View
      style={[styles.wrapper, { top: insets.top + 10 }, containerStyle]}
    >
      <TouchableOpacity
        onPress={triggerDismiss}
        activeOpacity={0.88}
        style={[styles.toast, { backgroundColor: config.bg }]}
      >
        <View style={[styles.accentBar, { backgroundColor: config.accent }]} />

        <View style={styles.body}>
          <View style={styles.row}>
            <Icon color={config.accent} />
            <View style={styles.textBlock}>
              <Text style={[styles.label, { color: config.accent }]}>
                {config.label}
              </Text>
              <Text style={styles.message} numberOfLines={2}>
                {toast.message}
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: config.accent },
                progressStyle,
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let toastIdCounter = 0;

export function ToastProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((options: ToastOptions) => {
    toastIdCounter += 1;
    setToast({ ...options, id: toastIdCounter });
  }, []);

  const dismiss = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && <ToastDisplay toast={toast} onDismiss={dismiss} />}
    </ToastContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  toast: {
    borderRadius: 14,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingTop: 13,
    paddingBottom: 10,
    paddingHorizontal: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: "Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  message: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "rgba(255, 255, 255, 0.82)",
    lineHeight: 20,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});

// ─── Usage ────────────────────────────────────────────────────────────────────
//
// 1. Wrap your root layout with <ToastProvider>:
//    <ToastProvider>
//      <Stack ... />
//    </ToastProvider>
//
// 2. Call useToast() anywhere inside:
//    const { show } = useToast();
//    show({ type: "success", message: "Profil mis à jour !" });
//    show({ type: "warning", message: "Connexion instable.", duration: 5000 });
//    show({ type: "error",   message: "Une erreur est survenue." });
