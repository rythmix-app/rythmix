import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useAuthStore } from "@/stores/authStore";
import OnboardingBanner from "@/components/OnboardingBanner";
import ProfileSpotifySection from "@/components/profile/ProfileSpotifySection";
import ProfileAchievementsSection from "@/components/profile/ProfileAchievementsSection";
import { ProfileRecentActivities } from "@/components/profile/ProfileRecentActivities";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useMyStats } from "@/hooks/useMyStats";
import { Skeleton } from "@/components/ui/Skeleton";

function getMemberSince(createdAt?: string): string {
  if (!createdAt) return "membre récemment";
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  if (diffMonths < 1) return "membre depuis moins d'un mois";
  if (diffMonths === 1) return "membre depuis 1 mois";
  if (diffMonths < 12) return `membre depuis ${diffMonths} mois`;
  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1
    ? "membre depuis 1 an"
    : `membre depuis ${diffYears} ans`;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { status } = useOnboardingStatus();
  const { stats, loading, error, retry } = useMyStats();

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <OnboardingBanner />
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {user
                  ? (
                      (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")
                    ).toUpperCase() || "??"
                  : "??"}
              </Text>
            </View>
          </View>

          <Text style={styles.username}>
            {user ? `@${user.username}` : "@utilisateur"}
          </Text>
          <Text style={styles.fullName}>
            {user
              ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
              : ""}
          </Text>
          <Text style={styles.memberSince}>
            {getMemberSince(user?.createdAt)}
          </Text>
        </View>

        {/* ── Statistiques ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <View style={styles.statsRow}>
            <StatCard
              label="Swipes"
              value={stats?.totalSwipes ?? 0}
              loading={loading}
            />
            <StatCard
              label="Parties jouées"
              value={stats?.gamesPlayed ?? 0}
              loading={loading}
            />
            <StatCard
              label="Streak"
              value={stats?.streak ?? 0}
              loading={loading}
              suffix={stats?.streak ? " j" : ""}
            />
          </View>
          {error && (
            <Pressable onPress={retry} style={styles.errorContainer}>
              <Text style={styles.errorText}>{error} - Réessayer</Text>
            </Pressable>
          )}
        </View>

        {/* ── Mes stats Spotify ── */}
        <ProfileSpotifySection />

        {/* ── Succès & Récompenses ── */}
        <ProfileAchievementsSection />

        {/* ── Activités récentes ── */}
        <ProfileRecentActivities />

        {/* ── Mes artistes favoris ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes artistes favoris</Text>
          <Pressable
            style={styles.favoriteArtistsCard}
            onPress={() => router.push("/onboarding/artists")}
            accessibilityRole="button"
          >
            <MaterialIcons
              name="music-note"
              size={22}
              color={Colors.primary.survol}
            />
            <View style={styles.favoriteArtistsContent}>
              <Text style={styles.favoriteArtistsTitle}>
                {status?.completed
                  ? "Modifier ta sélection"
                  : "Choisir mes artistes"}
              </Text>
              <Text style={styles.favoriteArtistsSubtitle}>
                {status?.artistsCount
                  ? `${status.artistsCount} artiste${status.artistsCount > 1 ? "s" : ""} sélectionné${status.artistsCount > 1 ? "s" : ""}`
                  : "Personnalise ton feed SwipeMix"}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={Colors.dark.icon}
            />
          </Pressable>
        </View>

        {/* ── Déconnexion ── */}
        <Pressable style={styles.logoutButton} onPress={logout}>
          <MaterialIcons name="logout" size={18} color="#FF4D4D" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  loading,
  suffix = "",
}: {
  label: string;
  value: number;
  loading?: boolean;
  suffix?: string;
}) {
  if (loading) {
    return <Skeleton height={84} style={styles.statCardSkeleton} />;
  }
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>
        {value}
        {suffix}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary.fondPremier,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary.CTADark,
    borderWidth: 2,
    borderColor: Colors.primary.survol,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.primary.survol,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 2,
  },
  fullName: {
    fontSize: 14,
    color: Colors.dark.icon,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: Colors.dark.icon,
    marginBottom: 10,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.CTA,
    paddingLeft: 10,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  statCardSkeleton: {
    flex: 1,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.primary.survol,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.icon,
    textAlign: "center",
  },
  errorContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  errorText: {
    color: "#FF4D4D",
    fontSize: 13,
  },

  // Favorite artists
  favoriteArtistsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  favoriteArtistsContent: {
    flex: 1,
  },
  favoriteArtistsTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  favoriteArtistsSubtitle: {
    color: Colors.dark.icon,
    fontSize: 12,
  },

  // Logout
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF4D4D",
    marginTop: 8,
  },
  logoutText: {
    color: "#FF4D4D",
    fontSize: 15,
    fontWeight: "600",
  },
});
