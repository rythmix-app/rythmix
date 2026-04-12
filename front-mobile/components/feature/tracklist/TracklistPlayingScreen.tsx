import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import GameLayout from "@/components/GameLayout";
import { GameErrorFeedback } from "@/components/GameErrorFeedback";
import { Colors } from "@/constants/Colors";
import { DeezerArtist } from "@/services/deezer-api";
import {
  AnswerFeedback,
  GameAlbum,
} from "@/hooks/feature/tracklist/useTracklistGame";

interface TracklistPlayingScreenProps {
  sessionId: string | null;
  currentAlbum: GameAlbum;
  selectedArtist: DeezerArtist | null;
  foundTrackIds: Set<number>;
  currentInput: string;
  setCurrentInput: (value: string) => void;
  answerFeedback: AnswerFeedback | null;
  timeRemaining: number;
  formatTime: (seconds: number) => string;
  shakeAnimation: Animated.Value;
  borderOpacity: Animated.Value;
  errorAnimationsEnabled: boolean;
  onSubmitAnswer: () => void;
  onAbandon: () => void;
  onSave: () => Promise<void>;
}

export default function TracklistPlayingScreen({
  sessionId,
  currentAlbum,
  selectedArtist,
  foundTrackIds,
  currentInput,
  setCurrentInput,
  answerFeedback,
  timeRemaining,
  formatTime,
  shakeAnimation,
  borderOpacity,
  errorAnimationsEnabled,
  onSubmitAnswer,
  onAbandon,
  onSave,
}: TracklistPlayingScreenProps) {
  const foundCount = foundTrackIds.size;
  const totalCount = currentAlbum.tracks.length;

  return (
    <GameErrorFeedback
      shakeAnimation={shakeAnimation}
      borderOpacity={borderOpacity}
      errorMessage={null}
      animationsEnabled={errorAnimationsEnabled}
    >
      <GameLayout title="Tracklist" sessionId={sessionId} onSave={onSave}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>
                {foundCount}/{totalCount}{" "}
                {foundCount > 1 ? "TROUVÉS" : "TROUVÉ"}
              </ThemedText>
            </View>
            <View
              style={[styles.badge, timeRemaining < 60 && styles.badgeWarning]}
            >
              <MaterialIcons
                name="timer"
                size={14}
                color={
                  timeRemaining < 60
                    ? Colors.game.warning
                    : Colors.primary.survol
                }
              />
              <ThemedText
                style={[
                  styles.badgeText,
                  timeRemaining < 60 && styles.badgeTextWarning,
                ]}
              >
                {formatTime(timeRemaining)}
              </ThemedText>
            </View>
          </View>
          <ScrollView
            style={styles.trackList}
            contentContainerStyle={styles.trackListContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.albumCard}>
              <Image
                source={{ uri: currentAlbum.album.cover_xl }}
                style={styles.coverImage}
              />
              <ThemedText style={styles.albumTitle}>
                {currentAlbum.album.title}
              </ThemedText>
              <ThemedText style={styles.artistName}>
                {currentAlbum.album.artist?.name ?? selectedArtist?.name}
              </ThemedText>
              <TouchableOpacity
                style={styles.abandonButtonSmall}
                onPress={onAbandon}
              >
                <ThemedText style={styles.abandonText}>Abandonner</ThemedText>
              </TouchableOpacity>
            </View>

            {currentAlbum.tracks.map((track, index) => {
              const isFound = foundTrackIds.has(track.id);
              return (
                <View key={track.id} style={styles.trackItem}>
                  <ThemedText style={styles.trackNumber}>
                    {index + 1}.
                  </ThemedText>
                  {isFound ? (
                    <>
                      <ThemedText style={styles.trackFound}>
                        {track.title}
                      </ThemedText>
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color={Colors.game.success}
                      />
                    </>
                  ) : (
                    <ThemedText style={styles.trackHidden}>
                      {track.title
                        .split(" ")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() +
                            "_".repeat(Math.max(0, word.length - 1)),
                        )
                        .join(" ")}
                    </ThemedText>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.inputWrapper}>
            {answerFeedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  answerFeedback.type === "correct"
                    ? styles.feedbackCorrect
                    : styles.feedbackWrong,
                ]}
              >
                <ThemedText style={styles.feedbackText}>
                  {answerFeedback.message}
                </ThemedText>
              </View>
            )}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.singleInput}
                placeholder="Tape un son..."
                placeholderTextColor={Colors.game.textSubtle}
                value={currentInput}
                onChangeText={setCurrentInput}
                onSubmitEditing={onSubmitAnswer}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="send"
                blurOnSubmit={false}
                accessibilityLabel="Saisir un titre de l'album"
                accessibilityHint="Entrez un titre de chanson de l'album pour valider votre réponse"
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={onSubmitAnswer}
                accessibilityLabel="Valider la réponse"
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="send"
                  size={22}
                  color={Colors.primary.survol}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </GameLayout>
    </GameErrorFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary.survol,
  },
  badgeWarning: {
    borderColor: Colors.game.warning,
  },
  badgeText: {
    color: Colors.primary.survol,
    fontSize: 13,
    fontWeight: "bold",
  },
  badgeTextWarning: {
    color: Colors.game.warning,
  },
  albumCard: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  coverImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  albumTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
  },
  artistName: {
    color: Colors.game.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  abandonButtonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.5)",
  },
  abandonText: {
    color: Colors.game.warning,
    fontSize: 13,
  },
  trackList: {
    flex: 1,
  },
  trackListContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  trackNumber: {
    color: Colors.game.textSubtle,
    fontSize: 14,
    minWidth: 28,
  },
  trackFound: {
    color: Colors.game.success,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  trackHidden: {
    color: Colors.game.textSubtle,
    fontSize: 15,
    flex: 1,
    letterSpacing: 2,
  },
  inputWrapper: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  feedbackBanner: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: "center",
  },
  feedbackCorrect: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
  },
  feedbackWrong: {
    backgroundColor: "rgba(244, 67, 54, 0.15)",
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  singleInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
});
