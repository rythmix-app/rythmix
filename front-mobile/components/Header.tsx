import React, { useState } from "react";
import { Href, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface HeaderProps {
  title: string;
  showSettings?: boolean;
  showBack?: boolean;
  isGame?: boolean;
  onBack?: () => void;
  onSettings?: () => void;
  variant?: "simple" | "withMenu" | "withBack";
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export default function Header({
  title,
  showSettings,
  showBack,
  isGame = false,
  onBack,
  onSettings,
  variant = "simple",
  style,
  titleStyle,
}: HeaderProps) {
  const { top } = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const hasBack =
    typeof showBack === "boolean" ? showBack : variant === "withBack";
  const wantsCenteredTitle = variant === "withBack" || hasBack;
  const hasSettings =
    typeof showSettings === "boolean" ? showSettings : variant === "withMenu";
  const shouldAddGap = hasBack || hasSettings || wantsCenteredTitle;

  const handleBackPress = () => {
    if (isGame && hasBack) {
      setIsModalVisible(true);
    } else {
      executeBack();
    }
  };

  const executeBack = () => {
    setIsModalVisible(false);
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSettingsPress = () => {
    if (onSettings) {
      onSettings();
      return;
    }
    router.push("/settings" as Href);
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: top + 12 }, style]}>
        <View style={[styles.content, shouldAddGap && styles.contentGapped]}>
          <View
            style={[
              styles.sideSlot,
              !hasBack &&
                (wantsCenteredTitle
                  ? styles.slotPlaceholder
                  : styles.slotCollapsed),
            ]}
          >
            {hasBack && (
              <TouchableOpacity
                onPress={handleBackPress}
                activeOpacity={0.8}
                style={styles.iconButton}
                accessibilityLabel="Retour"
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          <Text
            numberOfLines={1}
            accessibilityRole="header"
            style={[
              styles.title,
              wantsCenteredTitle ? styles.titleCentered : styles.titleLeft,
              titleStyle,
            ]}
          >
            {title}
          </Text>

          <View
            style={[
              styles.sideSlot,
              hasSettings
                ? undefined
                : wantsCenteredTitle
                  ? styles.slotPlaceholder
                  : styles.slotCollapsed,
            ]}
          >
            {hasSettings && (
              <TouchableOpacity
                onPress={handleSettingsPress}
                activeOpacity={0.8}
                style={styles.iconButton}
                accessibilityLabel="Ouvrir les paramètres"
              >
                <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.title, styles.modalTitle]}>Attention</Text>
            <Text style={styles.modalText}>
              Êtes-vous sûr de vouloir quitter la partie en cours ?
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  styles.confirmBtn,
                  styles.btnSecondary,
                ]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.btnLabel}>Non</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, styles.confirmBtn]}
                onPress={executeBack}
              >
                <Text style={styles.btnLabel}>Oui</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#0D7377",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentGapped: {
    gap: 12,
  },
  sideSlot: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  slotPlaceholder: {
    width: 48,
  },
  slotCollapsed: {
    width: 0,
  },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 40,
    fontFamily: "Bold",
    textShadowColor: "rgba(255, 255, 255, 0.40)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  titleCentered: {
    textAlign: "center",
  },
  titleLeft: {
    textAlign: "left",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#121212",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 0.2,
    borderColor: "#14FFEC",
  },
  modalTitle: {
    flex: 0,
    fontSize: 28,
    marginBottom: 16,
    textAlign: "center",
  },
  modalText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 32,
    color: "#FFFFFF",
    fontFamily: "Bold",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
  },
  confirmBtn: {
    width: 100,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0D7377",
  },
  btnSecondary: {
    backgroundColor: "#323232",
  },
  btnLabel: {
    color: "#FFFFFF",
    fontFamily: "Bold",
    fontSize: 16,
  },
});
