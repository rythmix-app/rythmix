import { Image, StyleSheet, Text, View } from "react-native";
import MusicTag from "@/components/swipe/MusicTag";

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
  color: "darkGreen" | "cyan" | "lightBLue";
}

interface MusicCardProps {
  data: MusicCardData;
}

export default function MusicCard({ data }: MusicCardProps) {
  return (
    <View style={[styles.container, styles[data.color]]}>
      <Image source={{ uri: data.coverImage }} style={styles.coverImage} />

      <View style={styles.bottomContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.artist}>{data.artist}</Text>
          <Text style={styles.album}>{data.album}</Text>
        </View>

        <View style={styles.tagsContainer}>
          <MusicTag text={data.tags.primary} color={"primary"} />
          <MusicTag text={data.tags.secondary} color={"primary"} />
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
  lightBLue: {
    backgroundColor: "#19B3BD",
  },
  coverImage: {
    width: 284,
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "center",
  },
  title: {
    fontSize: 22,
    color: "#FFFFFF",
    fontFamily: "Bold",
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
  },
  tagPrimary: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  tagPrimaryText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0D7D70",
  },
  tagSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  tagSecondaryText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  textContainer: {
    flexDirection: "column",
    gap: 6,
  },
  bottomContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },
});
