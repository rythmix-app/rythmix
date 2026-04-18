import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Button from "@/components/Button";
import Header from "@/components/Header";
import { Colors } from "@/constants/Colors";
import { useToast } from "@/components/Toast";
import { useSpotifyIntegration } from "@/hooks/useSpotifyIntegration";

export default function IntegrationsScreen() {
  const { status, isLoading, isConnecting, connect, disconnect } =
    useSpotifyIntegration();
  const { show } = useToast();

  const handleConnect = async () => {
    const result = await connect();
    if (result === "ok") {
      show({ type: "success", message: "Spotify connecté" });
    } else if (result === "error") {
      show({ type: "error", message: "La connexion Spotify a échoué" });
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    show({ type: "success", message: "Spotify déconnecté" });
  };

  const connected = status?.connected === true;

  return (
    <View style={styles.container}>
      <Header title="Intégrations" variant="withBack" />

      <View style={styles.content}>
        <Text style={styles.description}>
          Connecte ton compte Spotify pour que Rythmix personnalise ton
          expérience avec tes goûts musicaux.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.providerBadge}>
              <Text style={styles.providerIcon}>🎧</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Spotify</Text>
              <Text
                style={[
                  styles.cardStatus,
                  connected ? styles.cardStatusOn : styles.cardStatusOff,
                ]}
              >
                {isLoading
                  ? "Chargement…"
                  : connected
                    ? "Connecté"
                    : "Non connecté"}
              </Text>
            </View>
          </View>

          {connected ? (
            <View style={styles.buttonGroup}>
              <Button
                title="Voir mes stats"
                onPress={() =>
                  router.push({ pathname: "/integrations/spotify-stats" })
                }
              />
              <Button
                title="Déconnecter"
                variant="cancel"
                onPress={handleDisconnect}
              />
            </View>
          ) : (
            <Button
              title="Connecter Spotify"
              onPress={handleConnect}
              loading={isConnecting}
              disabled={isConnecting}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    color: Colors.dark.icon,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  providerBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1ED760",
    alignItems: "center",
    justifyContent: "center",
  },
  providerIcon: {
    fontSize: 22,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardStatusOn: {
    color: "#1ED760",
  },
  cardStatusOff: {
    color: Colors.dark.icon,
  },
  buttonGroup: {
    gap: 10,
  },
});
