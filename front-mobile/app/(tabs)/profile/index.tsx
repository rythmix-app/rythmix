import { View, Text, StyleSheet } from "react-native";
import Button from "@/components/Button";
import { useAuthStore } from "@/stores/authStore";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Écran Profil</Text>
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userText}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.userEmail}>@{user.username}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      )}
      <Button
        title="Se déconnecter"
        variant="secondary"
        size="large"
        onPress={handleLogout}
        style={styles.logoutButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    color: "white",
    marginBottom: 32,
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  userText: {
    fontSize: 18,
    color: "white",
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  logoutButton: {
    width: "80%",
    maxWidth: 300,
  },
});
