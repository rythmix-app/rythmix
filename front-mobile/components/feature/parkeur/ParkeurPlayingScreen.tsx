import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameAnswerInput } from "@/components/games/GameAnswerInput";
import Button from "@/components/Button";
import { Colors } from "@/constants/Colors";
import { answerHintTokens } from "@/utils/parkeur";
import type { ParkeurAnswer, ParkeurRound } from "@/types/gameSession";

interface Props {
  round: ParkeurRound;
  roundIndex: number;
  totalRounds: number;
  score: number;
  lastAnswer: ParkeurAnswer | null;
  isReveal: boolean;
  onSubmit: (input: string) => void;
  onSkip: () => void;
  onNext: () => void;
}

export default function ParkeurPlayingScreen({
  round,
  roundIndex,
  totalRounds,
  score,
  lastAnswer,
  isReveal,
  onSubmit,
  onSkip,
  onNext,
}: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<TextInput>(null);
  const hintTokens = useMemo(
    () => answerHintTokens(round.answerLine),
    [round.answerLine],
  );

  // Reset input when moving to a new round.
  useEffect(() => {
    if (!isReveal) setInput("");
  }, [round.trackId, isReveal]);

  const handleSubmit = () => {
    if (!input.trim() || isReveal) return;
    onSubmit(input);
  };

  const isLast = roundIndex + 1 >= totalRounds;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.scoreRow}>
          <ThemedText style={styles.scoreText}>
            Round {roundIndex + 1}/{totalRounds}
          </ThemedText>
          <ThemedText style={styles.scoreText}>Score : {score}</ThemedText>
        </View>

        <View style={styles.trackInfo}>
          {round.coverUrl ? (
            <Image source={{ uri: round.coverUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <MaterialIcons name="music-note" size={36} color="#555" />
            </View>
          )}
          <ThemedText style={styles.artist}>{round.artist}</ThemedText>
          <ThemedText style={styles.title}>{round.title}</ThemedText>
        </View>

        <View style={styles.lyricsBlock}>
          {round.lines.map((line, idx) => (
            <ThemedText key={idx} style={styles.lyricLine}>
              {line}
            </ThemedText>
          ))}
          <View style={styles.hintRow}>
            {hintTokens.length > 0 ? (
              hintTokens.map((token, idx) => (
                <View key={idx} style={styles.hintWord}>
                  <ThemedText style={styles.hintText}>{token}</ThemedText>
                </View>
              ))
            ) : (
              <ThemedText style={styles.hintText}>___</ThemedText>
            )}
          </View>
        </View>

        {isReveal && lastAnswer && (
          <View
            style={[
              styles.revealBlock,
              lastAnswer.correct ? styles.revealOk : styles.revealKo,
            ]}
          >
            <MaterialIcons
              name={lastAnswer.correct ? "check-circle" : "cancel"}
              size={28}
              color={lastAnswer.correct ? "#4ade80" : "#ff6b6b"}
            />
            <View style={styles.revealTextBlock}>
              <ThemedText style={styles.revealLabel}>
                {lastAnswer.correct ? "Bonne réponse !" : "Mauvaise réponse"}
              </ThemedText>
              <ThemedText style={styles.revealExpected}>
                {lastAnswer.expected}
              </ThemedText>
              {!lastAnswer.correct && lastAnswer.userInput && (
                <ThemedText style={styles.revealUserInput}>
                  Ta réponse : {lastAnswer.userInput}
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {isReveal ? (
          <Button
            title={isLast ? "Voir le score" : "Suivant"}
            onPress={onNext}
            style={styles.nextButton}
          />
        ) : (
          <View style={styles.inputBlock}>
            <GameAnswerInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onSubmit={handleSubmit}
              placeholder="Tape la suite des paroles…"
              disabled={!input.trim()}
              accessibilityLabel="Champ de réponse Parkeur"
              accessibilityHint="Saisis le vers manquant"
            />
            <Pressable
              onPress={onSkip}
              style={styles.skipButton}
              accessibilityRole="button"
              accessibilityLabel="Passer ce round"
            >
              <ThemedText style={styles.skipText}>Je ne sais pas</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.primary.fondPremier },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 18 },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  scoreText: { color: "#bbb", fontSize: 14, fontWeight: "600" },
  trackInfo: { alignItems: "center", marginVertical: 6, gap: 8 },
  cover: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: "#222",
  },
  coverPlaceholder: {
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  artist: {
    color: Colors.primary.survol,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  title: { color: "white", fontSize: 18, fontWeight: "700" },
  lyricsBlock: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 22,
    gap: 14,
  },
  lyricLine: {
    color: "white",
    fontSize: 20,
    lineHeight: 28,
    textAlign: "center",
  },
  hintRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  hintWord: { paddingHorizontal: 4 },
  hintText: {
    color: Colors.primary.survol,
    fontSize: 22,
    letterSpacing: 2,
    fontWeight: "700",
  },
  revealBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 12,
    padding: 14,
  },
  revealOk: { backgroundColor: "rgba(74, 222, 128, 0.12)" },
  revealKo: { backgroundColor: "rgba(255, 107, 107, 0.12)" },
  revealTextBlock: { flex: 1, gap: 4 },
  revealLabel: { color: "white", fontWeight: "700", fontSize: 15 },
  revealExpected: { color: "#ddd" },
  revealUserInput: { color: "#888", fontSize: 13, fontStyle: "italic" },
  inputBlock: { marginTop: 8, gap: 10 },
  skipButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: { color: "#999", fontSize: 14, textDecorationLine: "underline" },
  nextButton: { marginTop: 8 },
});
