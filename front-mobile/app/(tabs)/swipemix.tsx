import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CardStack from "../../components/swipe/CardStack";
import { MusicCardData } from "../../components/swipe/MusicCard";

const SAMPLE_CARDS: MusicCardData[] = [
  {
    id: "1",
    coverImage: "https://picsum.photos/288/200?random=1",
    title: "BAILE INOLVIDABLE",
    artist: "Bad Bunny",
    album: "DeBí TiRAR MáS FOToS",
    tags: {
      primary: "SALSA",
      secondary: "CONTEMPORAINE",
    },
    color: "darkGreen",
  },
  {
    id: "2",
    coverImage: "https://picsum.photos/288/200?random=2",
    title: "STARBOY",
    artist: "The Weeknd",
    album: "Starboy",
    tags: {
      primary: "POP",
      secondary: "R&B",
    },
    color: "cyan",
  },
  {
    id: "3",
    coverImage: "https://picsum.photos/288/200?random=3",
    title: "BLINDING LIGHTS",
    artist: "The Weeknd",
    album: "After Hours",
    tags: {
      primary: "SYNTH-POP",
      secondary: "ELECTRO",
    },
    color: "lightBLue",
  },
  {
    id: "4",
    coverImage: "https://picsum.photos/288/200?random=4",
    title: "LEVITATING",
    artist: "Dua Lipa",
    album: "Future Nostalgia",
    tags: {
      primary: "DISCO",
      secondary: "POP",
    },
    color: "darkGreen",
  },
  {
    id: "5",
    coverImage: "https://picsum.photos/288/200?random=5",
    title: "HEAT WAVES",
    artist: "Glass Animals",
    album: "Dreamland",
    tags: {
      primary: "INDIE",
      secondary: "ALTERNATIVE",
    },
    color: "cyan",
  },
];

export default function SwipeMixScreen() {
  const { top, bottom } = useSafeAreaInsets();

  const handleSwipeLeft = (card: MusicCardData) => {
    console.log("Swiped left:", card.title);
  };

  const handleSwipeRight = (card: MusicCardData) => {
    console.log("Swiped right:", card.title);
  };

  const handleEmpty = () => {
    console.log("No more cards!");
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}
      >
        <Text style={styles.title}>SwipeMix</Text>
        <View style={styles.swipeCardContainer}>
          <CardStack
            cards={SAMPLE_CARDS}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onEmpty={handleEmpty}
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
  },
  swipeCardContainer: {
    flex: 1,
  },
});
