import { Image, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import MusicTag from "@/components/swipe/MusicTag";
import { IconSymbol } from "@/components/ui/IconSymbol";

export interface MusicCardData {
  id: string;
  coverImage: string;
  title: string;
  artist: string;
  album: string;
  tags: {
    primary: string;
    secondary: string;
  };
  color: "darkGreen" | "cyan" | "lightBlue";
}

interface MusicCardProps {
  data: MusicCardData;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

export default function MusicCard({
  data,
  isPlaying = false,
  onTogglePlay,
}: MusicCardProps) {
  return (
    <View style={[styles.container, styles[data.color]]}>
      <View style={styles.coverContainer}>
        <Image source={{ uri: data.coverImage }} style={styles.coverImage} />
        {onTogglePlay && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={onTogglePlay}
            activeOpacity={0.7}
          >
            <View style={styles.playButtonInner}>
              <IconSymbol
                name={isPlaying ? "pause.fill" : "play.fill"}
                size={32}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <Text numberOfLines={1} style={styles.title}>
        {data.title}
      </Text>

      <View style={styles.bottomContainer}>
        <View style={styles.textContainer}>
          <Text numberOfLines={1} style={styles.artist}>
            {data.artist}
          </Text>
          <Text numberOfLines={1} style={styles.album}>
            {data.album}
          </Text>
        </View>

        <View style={styles.tagsContainer}>
          <MusicTag text={data.tags.primary} color={"primary"} />
          <MusicTag text={data.tags.secondary} color={"secondary"} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: "hidden",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 16,
  },
  darkGreen: {
    backgroundColor: "#052E30",
  },
  cyan: {
    backgroundColor: "#0D7377",
  },
  lightBlue: {
    backgroundColor: "#19B3BD",
  },
  coverContainer: {
    position: "relative",
    width: 284,
    height: 250,
    alignSelf: "center",
    marginBottom: 12,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "center",
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -35 }, { translateY: -35 }],
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  title: {
    fontSize: 22,
    color: "#FFFFFF",
    fontFamily: "Bold",
    marginVertical: 4,
  },
  artist: {
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 2,
    fontFamily: "Medium",
  },
  album: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  tagsContainer: {
    flexDirection: "column",
    alignSelf: "flex-end",
    gap: 4,
    maxWidth: "30%",
  },

  textContainer: {
    flexDirection: "column",
    maxWidth: "70%",
  },
  bottomContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },
});
