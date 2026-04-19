import { useEffect, useRef } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import GameLayout from "@/components/GameLayout";
import { GameErrorFeedback } from "@/components/GameErrorFeedback";
import { Colors } from "@/constants/Colors";

interface BlindtestPlayingScreenProps {
  sessionId: string | null;
  currentRoundIndex: number;
  totalRounds: number;
  timeRemaining: number;
  roundDuration: number;
  answerInput: string;
  setAnswerInput: (value: string) => void;
  artistFound: boolean;
  artistName: string;
  featuringNames: string[];
  foundFeaturings: string[];
  titleFound: boolean;
  trackTitle: string;
  isPlaying: boolean;
  shakeAnimation: Animated.Value;
  borderOpacity: Animated.Value;
  errorMessage: string | null;
  errorAnimationsEnabled: boolean;
  warmMessage: string | null;
  onSubmitAnswer: () => void;
  onAbandon: () => void;
  onSave: () => Promise<void>;
}

const FOUND_COLOR = "#2DD4BF";

export default function BlindtestPlayingScreen({
  sessionId,
  currentRoundIndex,
  totalRounds,
  timeRemaining,
  roundDuration,
  answerInput,
  setAnswerInput,
  artistFound,
  artistName,
  featuringNames,
  foundFeaturings,
  titleFound,
  trackTitle,
  isPlaying,
  shakeAnimation,
  borderOpacity,
  errorMessage,
  errorAnimationsEnabled,
  warmMessage,
  onSubmitAnswer,
  onAbandon,
  onSave,
}: BlindtestPlayingScreenProps) {
  const inputRef = useRef<TextInput>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const timerColor = timeRemaining <= 5 ? "#ff6b6b" : Colors.primary.survol;

  const circleScale = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.55],
    extrapolate: "clamp",
  });

  const circleOpacity = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
    extrapolate: "clamp",
  });

  // Keyboard show/hide animation (same pattern as Blurchette)
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardAnim, {
        toValue: 1,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardAnim]);

  // Smooth timeline — intentionally excludes timeRemaining from deps:
  // adding it would restart the animation every second. The value is read
  // once when currentRoundIndex changes (including resume).
  useEffect(() => {
    const elapsed = roundDuration - timeRemaining;
    const startValue = roundDuration > 0 ? elapsed / roundDuration : 0;
    progressAnim.setValue(startValue);

    if (timeRemaining > 0) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: timeRemaining * 1000,
        useNativeDriver: false,
      }).start();
    }

    return () => progressAnim.stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoundIndex, progressAnim, roundDuration]);

  // Auto-focus after each answer attempt
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, [artistFound, foundFeaturings, titleFound, answerInput]);

  return (
    <GameErrorFeedback
      shakeAnimation={shakeAnimation}
      borderOpacity={borderOpacity}
      errorMessage={errorMessage}
      animationsEnabled={errorAnimationsEnabled}
    >
      <GameLayout
        title="Blind Test"
        sessionId={sessionId}
        onSave={onSave}
        onBack={onAbandon}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Header: round + timer + timeline + chips */}
          <View style={styles.headerSection}>
            <View style={styles.topBar}>
              <View style={styles.roundBadge}>
                <ThemedText style={styles.roundText}>
                  Manche {currentRoundIndex + 1}/{totalRounds}
                </ThemedText>
              </View>
              <View style={[styles.timerBadge, { borderColor: timerColor }]}>
                <MaterialIcons name="timer" size={18} color={timerColor} />
                <ThemedText style={[styles.timerText, { color: timerColor }]}>
                  {timeRemaining}s
                </ThemedText>
              </View>
            </View>

            <View style={styles.timelineTrack}>
              <Animated.View
                style={[
                  styles.timelineFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                    backgroundColor: timerColor,
                  },
                ]}
              />
            </View>

            <View style={styles.chipsContainer}>
              <AnswerChip
                label="Artiste"
                found={artistFound}
                foundLabel={artistFound ? artistName : undefined}
              />
              {featuringNames.map((name) => {
                const isFound = foundFeaturings.includes(name);
                return (
                  <AnswerChip
                    key={name}
                    label="Feat."
                    found={isFound}
                    foundLabel={isFound ? name : undefined}
                  />
                );
              })}
              <AnswerChip
                label="Titre"
                found={titleFound}
                foundLabel={titleFound ? trackTitle : undefined}
              />
            </View>
          </View>

          {/* Center: audio circle (scales down with keyboard) */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.audioSection}>
              <Animated.View
                style={{
                  transform: [{ scale: circleScale }],
                  opacity: circleOpacity,
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View style={styles.audioCircle}>
                  <MaterialIcons
                    name={isPlaying ? "music-note" : "music-off"}
                    size={48}
                    color={Colors.primary.survol}
                  />
                </View>
                <ThemedText style={styles.audioHint}>
                  {isPlaying ? "Écoutez bien..." : "Chargement audio..."}
                </ThemedText>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>

          {/* Bottom: warm message + input */}
          <View style={styles.inputSection}>
            {warmMessage && (
              <View style={styles.warmBanner}>
                <MaterialIcons name="whatshot" size={18} color="#FF9800" />
                <ThemedText style={styles.warmText}>{warmMessage}</ThemedText>
              </View>
            )}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={answerInput}
                onChangeText={setAnswerInput}
                placeholder="Artiste, featuring ou titre..."
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={onSubmitAnswer}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !answerInput.trim() && styles.sendButtonDisabled,
                ]}
                onPress={onSubmitAnswer}
                disabled={!answerInput.trim()}
              >
                <MaterialIcons
                  name="send"
                  size={20}
                  color={answerInput.trim() ? "white" : "#666"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </GameLayout>
    </GameErrorFeedback>
  );
}

function AnswerChip({
  label,
  found,
  foundLabel,
}: {
  label: string;
  found: boolean;
  foundLabel?: string;
}) {
  return (
    <View style={[styles.chip, found ? styles.chipFound : styles.chipDefault]}>
      {found && <MaterialIcons name="check" size={14} color={FOUND_COLOR} />}
      <ThemedText
        style={[styles.chipText, { color: found ? FOUND_COLOR : "#888" }]}
        numberOfLines={1}
      >
        {found && foundLabel ? foundLabel : label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  headerSection: {
    padding: 20,
    paddingBottom: 10,
    gap: 12,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roundBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roundText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  timelineTrack: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  timelineFill: {
    height: "100%",
    borderRadius: 3,
  },
  chipsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chipDefault: {
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "transparent",
  },
  chipFound: {
    borderColor: FOUND_COLOR,
    backgroundColor: "rgba(45, 212, 191, 0.1)",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  audioSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  audioCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 3,
    borderColor: Colors.primary.survol,
    justifyContent: "center",
    alignItems: "center",
  },
  audioHint: {
    color: "#999",
    fontSize: 16,
  },
  inputSection: {
    padding: 20,
    gap: 10,
  },
  warmBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 152, 0, 0.15)",
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
  },
  warmText: {
    color: "#FF9800",
    fontSize: 15,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary.survol,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});
