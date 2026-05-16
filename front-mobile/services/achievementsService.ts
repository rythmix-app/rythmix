import { get } from "./api";
import {
  GetMyAchievementsResponse,
  UserAchievement,
  UserAchievementWithDetails,
} from "@/types/achievement";

function flatten(item: UserAchievement): UserAchievementWithDetails {
  return {
    id: item.achievement.id,
    name: item.achievement.name,
    description: item.achievement.description,
    icon: item.achievement.icon,
    type: item.achievement.type,
    currentProgress: item.currentProgress,
    requiredProgress: item.requiredProgress,
    unlockedAt: item.unlockedAt,
  };
}

export const getMyAchievements = async (): Promise<
  UserAchievementWithDetails[]
> => {
  const data = await get<GetMyAchievementsResponse>(
    "/api/user-achievements/me",
  );
  return data.userAchievements.map(flatten);
};
