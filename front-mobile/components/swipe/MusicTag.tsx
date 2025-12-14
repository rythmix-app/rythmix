import React from "react";
import { View, Text, StyleSheet } from "react-native";

type MusicTagProps = {
  text: string;
  color: "primary" | "secondary";
};

const MusicTag: React.FC<MusicTagProps> = ({ text, color }) => {
  const containerStyle = [
    styles.container,
    color === "primary" ? styles.primary : styles.secondary,
  ];

  return (
    <View style={containerStyle}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 50,
    alignSelf: "flex-start",
  },
  primary: {
    backgroundColor: "#19B3BD",
  },
  secondary: {
    backgroundColor: "#0D7377",
  },
  text: {
    color: "white",
    textTransform: "uppercase",
    fontSize: 10,
    fontFamily: 'Semibold'
  },
});

export default MusicTag;
