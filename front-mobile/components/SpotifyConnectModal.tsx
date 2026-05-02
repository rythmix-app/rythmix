import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

interface SpotifyConnectModalProps {
  visible: boolean;
  isConnecting?: boolean;
  onConnect: () => void;
  onDismiss: () => void;
  title?: string;
  message?: string;
}

const DEFAULT_TITLE = "Connecte Spotify pour sauvegarder tes découvertes";
const DEFAULT_MESSAGE =
  'Tes likes SwipeMix seront automatiquement ajoutés à ta playlist privée "Rythmix Likes" sur Spotify.';

export default function SpotifyConnectModal({
  visible,
  isConnecting = false,
  onConnect,
  onDismiss,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
}: SpotifyConnectModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <FontAwesome name="spotify" size={22} color="#1DB954" />
            <Text style={styles.brandLabel}>via Spotify</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onConnect}
            disabled={isConnecting}
            accessibilityRole="button"
            accessibilityLabel="Connecter Spotify"
          >
            <Text style={styles.btnPrimaryLabel}>
              {isConnecting ? "Connexion..." : "Connecter maintenant"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={onDismiss}
            disabled={isConnecting}
            accessibilityRole="button"
            accessibilityLabel="Plus tard"
          >
            <Text style={styles.btnSecondaryLabel}>Plus tard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  brandLabel: {
    color: "#1DB954",
    fontFamily: "Medium",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Bold",
    fontSize: 18,
    marginBottom: 8,
  },
  message: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: "#1DB954",
    marginBottom: 10,
  },
  btnPrimaryLabel: {
    color: "#0A0A0A",
    fontFamily: "Bold",
    fontSize: 15,
  },
  btnSecondary: {
    paddingVertical: 12,
    alignItems: "center",
  },
  btnSecondaryLabel: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Medium",
    fontSize: 14,
  },
});
