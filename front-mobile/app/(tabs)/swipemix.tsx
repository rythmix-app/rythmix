import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CardStack from "@/components/swipe/CardStack";
import { useSwipeMix } from "@/hooks/useSwipeMix";

export default function SwipeMixScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const { cards, handlers, audioPlayer, error, actions } = useSwipeMix();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}
      >
        <Text style={styles.title}>SwipeMix</Text>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <View style={styles.swipeCardContainer}>
          <CardStack
            cards={cards}
            onSwipeLeft={handlers.onSwipeLeft}
            onSwipeRight={handlers.onSwipeRight}
            onEmpty={handlers.onEmpty}
            onLoadMore={actions.loadMore}
            currentTrackId={audioPlayer.currentTrack?.id.toString()}
            isPlaying={audioPlayer.isPlaying}
            onTogglePlay={handlers.onTogglePlay}
            onCardAppear={handlers.onCardAppear}
          />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  title: {
    fontSize: 24,
    color: "white",
    textAlign: "center",
    marginVertical: 16,
  },
  errorContainer: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 4,
  },
  errorText: {
    color: "#F44336",
    fontSize: 14,
    fontFamily: "Medium",
  },
  swipeCardContainer: {
    flex: 1,
  },
});
