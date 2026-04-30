import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import GameLayout from "@/components/GameLayout";
import { GameErrorFeedback } from "@/components/GameErrorFeedback";
import { Colors } from "@/constants/Colors";
import { GameAnswerInput } from "@/components/games/GameAnswerInput";
import {
  BlurLevel,
  GameTrack,
  getBlurRadius,
} from "@/hooks/feature/blurchette/useBlurchetteGame";

interface BlurchettePlayingScreenProps {
  sessionId: string | null;
  currentTrack: GameTrack;
  blurLevel: BlurLevel;
  answer: string;
  setAnswer: (value: string) => void;
  albumScale: Animated.AnimatedInterpolation<number>;
  albumOpacity: Animated.AnimatedInterpolation<number>;
  shakeAnimation: Animated.Value;
  borderOpacity: Animated.Value;
  errorMessage: string | null;
  errorAnimationsEnabled: boolean;
  onSubmitAnswer: () => void;
  onAbandon: () => void;
  onSave: () => Promise<void>;
}

export default function BlurchettePlayingScreen({
  sessionId,
  currentTrack,
  blurLevel,
  answer,
  setAnswer,
  albumScale,
  albumOpacity,
  shakeAnimation,
  borderOpacity,
  errorMessage,
  errorAnimationsEnabled,
  onSubmitAnswer,
  onAbandon,
  onSave,
}: BlurchettePlayingScreenProps) {
  return (
    <GameErrorFeedback
      shakeAnimation={shakeAnimation}
      borderOpacity={borderOpacity}
      errorMessage={errorMessage}
      animationsEnabled={errorAnimationsEnabled}
    >
      <GameLayout title="Blurchette" sessionId={sessionId} onSave={onSave}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.gameHeader}>
            <View style={styles.levelInfo}>
              <View style={styles.levelBadge}>
                <ThemedText style={styles.levelText}>
                  Niveau {blurLevel}/5
                </ThemedText>
              </View>
              <ThemedText style={styles.hintText}>
                {currentTrack.isAlbum
                  ? "🎵 Trouvez l'album"
                  : "🎤 Trouvez le single"}
              </ThemedText>
              <TouchableOpacity onPress={onAbandon}>
                <MaterialIcons name="close" size={24} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.albumContainer}>
              <Animated.View
                style={[
                  styles.albumPlaceholder,
                  {
                    transform: [{ scale: albumScale }],
                    opacity: albumOpacity,
                  },
                ]}
              >
                <Image
                  source={{ uri: currentTrack.track.album.cover_xl }}
                  style={styles.albumImage}
                  blurRadius={getBlurRadius(blurLevel)}
                />
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>

          <View style={styles.answerSection}>
            <GameAnswerInput
              value={answer}
              onChangeText={setAnswer}
              onSubmit={onSubmitAnswer}
              placeholder="Entrez votre réponse..."
            />
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
  gameHeader: {
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    gap: 12,
  },
  levelInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  hintText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  albumContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  albumPlaceholder: {
    width: 320,
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  albumImage: {
    width: "100%",
    height: "100%",
  },
  answerSection: {
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});
