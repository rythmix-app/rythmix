import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useAuthStore } from "@/stores/authStore";

// TODO: à modifier plus tard - remplacer par des données récupérées depuis l'API
const MOCK_STATS = {
  swipes: 142,
  matchs: 87,
  gamesPlayed: 23,
};

// TODO: à modifier plus tard - remplacer par des données récupérées depuis l'API
const MOCK_TOP_ARTISTS = [
  { id: "1", name: "Daft Punk", avatarUrl: null },
  { id: "2", name: "Stromae", avatarUrl: null },
  { id: "3", name: "Aya Nakamura", avatarUrl: null },
];

// TODO: à modifier plus tard - remplacer par des données récupérées depuis l'API
const MOCK_TOP_GENRES = [
  { id: "1", name: "Électro", percentage: 45 },
  { id: "2", name: "Pop", percentage: 30 },
  { id: "3", name: "Hip-Hop", percentage: 15 },
  { id: "4", name: "Rock", percentage: 10 },
];

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
  return diffYears === 1 ? "membre depuis 1 an" : `membre depuis ${diffYears} ans`;
}

export default function ProfileScreen() {
  const { user } = useAuthStore();

  const handleSettings = () => {
    router.push("/settings");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {user ? user.firstName[0].toUpperCase() + user.lastName[0].toUpperCase() : "??"}
              </Text>
            </View>
          </View>

          <Text style={styles.username}>
            {user ? `@${user.username}` : "@utilisateur"}
          </Text>
          <Text style={styles.fullName}>
            {user ? `${user.firstName} ${user.lastName}` : ""}
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

        {/* ── Mes préférences ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes préférences</Text>

          <Text style={styles.subSectionTitle}>TOP Artistes</Text>
          <View style={styles.podium}>
            {/* 2e place */}
            <View style={styles.podiumItem}>
              <Text style={styles.podiumMedal}>🥈</Text>
              <View style={[styles.podiumAvatar, styles.podiumAvatar2]}>
                {MOCK_TOP_ARTISTS[1]?.avatarUrl ? (
                  <Image source={{ uri: MOCK_TOP_ARTISTS[1].avatarUrl }} style={styles.podiumAvatarImage2} />
                ) : (
                  <Text style={styles.podiumAvatarFallback}>🎤</Text>
                )}
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{MOCK_TOP_ARTISTS[1]?.name}</Text>
              <View style={[styles.podiumBase, styles.podiumBase2]}>
                <Text style={styles.podiumRank}>2</Text>
              </View>
            </View>

            {/* 1re place */}
            <View style={styles.podiumItem}>
              <Text style={styles.podiumMedal}>🥇</Text>
              <View style={[styles.podiumAvatar, styles.podiumAvatar1]}>
                {MOCK_TOP_ARTISTS[0]?.avatarUrl ? (
                  <Image source={{ uri: MOCK_TOP_ARTISTS[0].avatarUrl }} style={styles.podiumAvatarImage1} />
                ) : (
                  <Text style={[styles.podiumAvatarFallback, { fontSize: 30 }]}>🎤</Text>
                )}
              </View>
              <Text style={[styles.podiumName, styles.podiumName1]} numberOfLines={1}>{MOCK_TOP_ARTISTS[0]?.name}</Text>
              <View style={[styles.podiumBase, styles.podiumBase1]}>
                <Text style={[styles.podiumRank, styles.podiumRank1]}>1</Text>
              </View>
            </View>

            {/* 3e place */}
            <View style={styles.podiumItem}>
              <Text style={styles.podiumMedal}>🥉</Text>
              <View style={[styles.podiumAvatar, styles.podiumAvatar3]}>
                {MOCK_TOP_ARTISTS[2]?.avatarUrl ? (
                  <Image source={{ uri: MOCK_TOP_ARTISTS[2].avatarUrl }} style={styles.podiumAvatarImage3} />
                ) : (
                  <Text style={[styles.podiumAvatarFallback, { fontSize: 18 }]}>🎤</Text>
                )}
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{MOCK_TOP_ARTISTS[2]?.name}</Text>
              <View style={[styles.podiumBase, styles.podiumBase3]}>
                <Text style={styles.podiumRank}>3</Text>
              </View>
            </View>
          </View>

          <Text style={styles.subSectionTitle}>TOP Genres</Text>
          {MOCK_TOP_GENRES.map((genre) => (
            <View key={genre.id} style={styles.genreRow}>
              <Text style={styles.genreName}>{genre.name}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${genre.percentage}%` }]}
                />
              </View>
              <Text style={styles.genrePercent}>{genre.percentage}%</Text>
            </View>
          ))}
        </View>

        {/* ── Succès & Récompenses ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleCentered}>Succès & Récompenses</Text>
          <View style={styles.badgesGrid}>
            {MOCK_BADGES.map((badge) => (
              <View
                key={badge.id}
                style={[styles.badgeItem, !badge.unlocked && styles.badgeLocked]}
              >
                <Text style={styles.badgeIcon}>
                  {badge.unlocked ? badge.icon : "🔒"}
                </Text>
                <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
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
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.icon,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  settingsIcon: {
    fontSize: 14,
  },
  settingsText: {
    color: Colors.dark.icon,
    fontSize: 13,
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
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.icon,
    marginBottom: 10,
    marginTop: 4,
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

  // Podium TOP Artistes
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  podiumItem: {
    flex: 1,
    alignItems: "center",
  },
  podiumMedal: {
    fontSize: 20,
    marginBottom: 6,
  },
  podiumAvatar: {
    borderRadius: 100,
    backgroundColor: "#1A1A1A",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  podiumAvatar1: {
    width: 72,
    height: 72,
    borderColor: "#FFD700",
  },
  podiumAvatar2: {
    width: 56,
    height: 56,
    borderColor: "#C0C0C0",
  },
  podiumAvatar3: {
    width: 48,
    height: 48,
    borderColor: "#CD7F32",
  },
  podiumAvatarImage1: { width: 72, height: 72, borderRadius: 36 },
  podiumAvatarImage2: { width: 56, height: 56, borderRadius: 28 },
  podiumAvatarImage3: { width: 48, height: 48, borderRadius: 24 },
  podiumAvatarFallback: {
    fontSize: 22,
  },
  podiumName: {
    fontSize: 11,
    color: Colors.dark.text,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 6,
  },
  podiumName1: {
    fontSize: 12,
    color: "#FFD700",
  },
  podiumBase: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  podiumBase1: {
    height: 70,
    backgroundColor: "#2A2200",
    borderTopWidth: 2,
    borderColor: "#FFD700",
  },
  podiumBase2: {
    height: 50,
    backgroundColor: "#1E1E1E",
    borderTopWidth: 2,
    borderColor: "#C0C0C0",
  },
  podiumBase3: {
    height: 35,
    backgroundColor: "#1A1209",
    borderTopWidth: 2,
    borderColor: "#CD7F32",
  },
  podiumRank: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.dark.icon,
  },
  podiumRank1: {
    color: "#FFD700",
    fontSize: 20,
  },

  // Genres
  genreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  genreName: {
    width: 72,
    fontSize: 13,
    color: Colors.dark.text,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#2A2A2A",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary.CTA,
    borderRadius: 4,
  },
  genrePercent: {
    width: 36,
    fontSize: 12,
    color: Colors.dark.icon,
    textAlign: "right",
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
});
