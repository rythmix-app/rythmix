import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useAuthStore } from "@/stores/authStore";
import OnboardingBanner from "@/components/OnboardingBanner";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

// TODO: à modifier plus tard - remplacer par des données récupérées depuis l'APIii
const MOCK_STATS = {
  swipes: 142,
  matchs: 87,
  gamesPlayed: 23,
};

// TODO: à modifier plus tard - remplacer par des données récupérées depuis l'API
const MOCK_BADGES = [
  { id: "1", name: "Bienvenue dans l'arène", icon: "🏟️", unlocked: true },
  { id: "2", name: "Premier pas", icon: "👣", unlocked: true },
  { id: "3", name: "Première victoire", icon: "🥇", unlocked: true },
  { id: "4", name: "Oreille d'or", icon: "🎧", unlocked: true },
  { id: "5", name: "Éclair", icon: "⚡", unlocked: true },
  { id: "6", name: "Perfectionniste", icon: "💎", unlocked: false },
  { id: "7", name: "Vétéran", icon: "🏆", unlocked: false },
  { id: "8", name: "Légende", icon: "👑", unlocked: false },
  { id: "9", name: "Mélomane absolu", icon: "🎵", unlocked: false },
];

// TODO: à modifier plus tard - remplacer par des données récupérées depuis l'API
const MOCK_RECENT_ACTIVITIES = [
  {
    id: "1",
    name: "Partie Blurchette",
    detail: "Score : 8/10",
    relativeDate: "Il y a 2h",
  },
  {
    id: "2",
    name: "Titre mis en favori",
    detail: "One More Time - Daft Punk",
    relativeDate: "Il y a 5h",
  },
  {
    id: "3",
    name: "Partie Tracklist",
    detail: "Score : 6/10",
    relativeDate: "Hier",
  },
  {
    id: "4",
    name: "Titre mis en favori",
    detail: "Papaoutai - Stromae",
    relativeDate: "Il y a 2 jours",
  },
];

// TODO: à modifier plus tard - niveau et titre à récupérer depuis l'API
const MOCK_LEVEL = { level: 7, title: "Mélomane" };

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

          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>
              Niveau {MOCK_LEVEL.level} — {MOCK_LEVEL.title}
            </Text>
          </View>
        </View>

        {/* ── Statistiques ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <View style={styles.statsRow}>
            <StatCard label="Swipes" value={MOCK_STATS.swipes} />
            <StatCard label="Matchs" value={MOCK_STATS.matchs} />
            <StatCard label="Jeux joués" value={MOCK_STATS.gamesPlayed} />
          </View>
        </View>

        {/* ── Succès & Récompenses ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleCentered}>Succès & Récompenses</Text>
          <View style={styles.badgesGrid}>
            {MOCK_BADGES.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeItem,
                  !badge.unlocked && styles.badgeLocked,
                ]}
              >
                <Text style={styles.badgeIcon}>
                  {badge.unlocked ? badge.icon : "🔒"}
                </Text>
                <Text
                  style={[
                    styles.badgeName,
                    !badge.unlocked && styles.badgeNameLocked,
                  ]}
                >
                  {badge.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Activités récentes ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activités récentes</Text>
          {MOCK_RECENT_ACTIVITIES.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityName}>{activity.name}</Text>
                <Text style={styles.activityDetail}>{activity.detail}</Text>
              </View>
              <Text style={styles.activityDate}>{activity.relativeDate}</Text>
            </View>
          ))}
        </View>

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
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
  levelBadge: {
    backgroundColor: Colors.primary.CTADark,
    borderWidth: 1,
    borderColor: Colors.primary.CTA,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 16,
  },
  levelText: {
    color: Colors.primary.survol,
    fontSize: 13,
    fontWeight: "600",
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
  sectionTitleCentered: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 14,
    textAlign: "center",
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

  // Badges
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  badgeItem: {
    width: "31%",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary.CTA,
  },
  badgeLocked: {
    borderColor: "#2A2A2A",
    opacity: 0.5,
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeName: {
    fontSize: 11,
    color: Colors.dark.text,
    textAlign: "center",
    fontWeight: "600",
  },
  badgeNameLocked: {
    color: Colors.dark.icon,
  },

  // Activities
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
    gap: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.CTA,
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: "600",
    marginBottom: 2,
  },
  activityDetail: {
    fontSize: 12,
    color: Colors.dark.icon,
  },
  activityDate: {
    fontSize: 11,
    color: Colors.game.textMuted,
    flexShrink: 0,
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
