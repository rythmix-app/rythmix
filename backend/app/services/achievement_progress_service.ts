import Achievement from '#models/achievement'
import UserAchievement from '#models/user_achievement'
import { AchievementType } from '#enums/achievement_type'

const REQUIRED_PROGRESS_BY_TYPE = new Map<AchievementType, number>([
  [AchievementType.FirstGame, 1],
  [AchievementType.FirstLike, 1],
  [AchievementType.FirstWin, 1],
  [AchievementType.PerfectGame, 1],
  [AchievementType.GamesPlayed, 50],
  [AchievementType.TotalGamesPlayed, 500],
  [AchievementType.TotalLikes, 500],
  [AchievementType.TotalCorrectAnswers, 500],
  [AchievementType.FastAnswer, 1],
  [AchievementType.LaunchDaySignup, 1],
  [AchievementType.Comeback, 1],
])

export class AchievementProgressService {
  getRequiredProgress(type: AchievementType): number | undefined {
    return REQUIRED_PROGRESS_BY_TYPE.get(type)
  }

  async ensureAndIncrement(
    userId: string,
    type: AchievementType,
    amount: number = 1
  ): Promise<UserAchievement | null> {
    if (amount <= 0) {
      return null
    }

    const requiredProgress = REQUIRED_PROGRESS_BY_TYPE.get(type)
    if (requiredProgress === undefined) {
      return null
    }

    const achievement = await Achievement.findBy('type', type)
    if (!achievement) {
      return null
    }

    let userAchievement = await UserAchievement.query()
      .where('user_id', userId)
      .where('achievement_id', achievement.id)
      .first()

    if (!userAchievement) {
      userAchievement = await UserAchievement.create({
        userId,
        achievementId: achievement.id,
        currentProgress: 0,
        requiredProgress,
        currentTier: 1,
        progressData: {},
      })
    }

    if (userAchievement.unlockedAt) {
      return userAchievement
    }

    userAchievement.currentProgress += amount
    await userAchievement.save()

    return userAchievement
  }
}

export default AchievementProgressService
