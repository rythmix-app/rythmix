import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  variant?: "danger" | "primary";
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  secondaryLabel,
  onSecondary,
  variant = "primary",
}: ConfirmationModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalText}>{message}</Text>

          <View style={styles.buttonColumn}>
            <TouchableOpacity
              style={[styles.btn, styles.btnConfirm]}
              onPress={onConfirm}
            >
              <Text style={styles.btnLabel}>{confirmLabel}</Text>
            </TouchableOpacity>

            {secondaryLabel && onSecondary && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  variant === "danger" ? styles.btnDanger : styles.btnSecondary,
                ]}
                onPress={onSecondary}
              >
                <Text style={styles.btnLabel}>{secondaryLabel}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={onCancel}
            >
              <Text style={styles.btnLabel}>{cancelLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
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
  buttonColumn: {
    width: "100%",
    gap: 12,
  },
  btn: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  btnConfirm: {
    backgroundColor: "#0D7377",
  },
  btnSecondary: {
    backgroundColor: "#323232",
  },
  btnDanger: {
    backgroundColor: "#ff6b6b",
  },
  btnCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  btnLabel: {
    color: "#FFFFFF",
    fontFamily: "Bold",
    fontSize: 15,
  },
});
