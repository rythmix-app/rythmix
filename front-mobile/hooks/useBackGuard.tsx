import { type ReactNode, useState } from "react";
import { router } from "expo-router";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface UseBackGuardOptions {
  enabled: boolean;
  onSave?: () => void;
}

interface UseBackGuardResult {
  onBack: () => void;
  backGuardModal: ReactNode;
}

export function useBackGuard({
  enabled,
  onSave,
}: UseBackGuardOptions): UseBackGuardResult {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const navigateBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSaveAndQuit = () => {
    setIsModalVisible(false);
    if (onSave) {
      onSave();
    }
    navigateBack();
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const onBack = () => {
    if (enabled) {
      setIsModalVisible(true);
    } else {
      navigateBack();
    }
  };

  const backGuardModal = (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Quitter la partie ?</Text>
          <Text style={styles.modalText}>
            Souhaitez-vous sauvegarder votre progression pour reprendre plus
            tard ?
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSave]}
              onPress={handleSaveAndQuit}
            >
              <Text style={styles.btnLabel}>Sauvegarder</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={handleCancel}
            >
              <Text style={styles.btnLabel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return { onBack, backGuardModal };
}

const styles = StyleSheet.create({
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
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "Bold",
    textShadowColor: "rgba(255, 255, 255, 0.40)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    marginBottom: 16,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: "#FFFFFF",
    fontFamily: "Bold",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  btnSave: {
    backgroundColor: "#0D7377",
  },
  btnCancel: {
    backgroundColor: "#323232",
  },
  btnLabel: {
    color: "#FFFFFF",
    fontFamily: "Bold",
    fontSize: 15,
  },
});
