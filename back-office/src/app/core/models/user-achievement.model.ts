export interface AchievementRef {
  id: number;
  name: string;
  description: string | null;
  type: string;
  icon: string | null;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: number;
  currentProgress: number;
  requiredProgress: number;
  currentTier: number;
  progressData: Record<string, unknown>;
  unlockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  achievement?: AchievementRef;
}
