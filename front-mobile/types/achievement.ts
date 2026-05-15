export interface Achievement {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  type: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: number;
  currentProgress: number;
  requiredProgress: number;
  currentTier: number;
  unlockedAt: string | null;
  achievement: Achievement;
}

export interface UserAchievementWithDetails {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  type: string;
  currentProgress: number;
  requiredProgress: number;
  unlockedAt: string | null;
}

export interface GetMyAchievementsResponse {
  userAchievements: UserAchievement[];
}
