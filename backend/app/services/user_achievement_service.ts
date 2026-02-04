import UserAchievement from '#models/user_achievement'
import Achievement from '#models/achievement'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export class UserAchievementService {
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return UserAchievement.query().where('user_id', userId).preload('achievement')
  }

  async getAll(): Promise<UserAchievement[]> {
    return UserAchievement.query().preload('user').preload('achievement')
  }

  async startTracking(
    userId: string,
    achievementId: number,
    requiredProgress?: number
  ): Promise<UserAchievement | { error: string; status: number }> {
    try {
      const achievement = await Achievement.find(achievementId)
      if (!achievement) {
        return { error: 'Achievement not found', status: 404 }
      }

      const userAchievement = await UserAchievement.create({
        userId,
        achievementId,
        currentProgress: 0,
        currentTier: 1,
        requiredProgress: requiredProgress || 100,
        progressData: {},
      })

      await userAchievement.load('achievement')
      return userAchievement
    } catch (error: any) {
      if (error.code === '23505') {
        return { error: 'Already tracking this achievement', status: 409 }
      }
      if (error.code === '23503') {
        return { error: 'Achievement not found', status: 404 }
      }
      throw error
    }
  }

  async incrementProgress(
    userAchievementId: string,
    userId: string,
    amount: number
  ): Promise<UserAchievement | { error: string; status: number }> {
    if (amount <= 0) {
      return { error: 'Amount must be positive', status: 400 }
    }

    const trx = await db.connection().transaction()

    try {
      const userAchievement = await UserAchievement.query({ client: trx })
        .where('id', userAchievementId)
        .where('user_id', userId)
        .first()

      if (!userAchievement) {
        await trx.rollback()
        return { error: 'User achievement not found', status: 404 }
      }

      if (userAchievement.unlockedAt) {
        await trx.rollback()
        return { error: 'Achievement already unlocked', status: 400 }
      }

      userAchievement.currentProgress += amount

      // Auto-unlock if progress requirement is met
      if (
        userAchievement.currentProgress >= userAchievement.requiredProgress &&
        !userAchievement.unlockedAt
      ) {
        userAchievement.unlockedAt = DateTime.now()
      }

      await userAchievement.save()
      await trx.commit()

      await userAchievement.load('achievement')

      return userAchievement
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async removeTracking(
    userAchievementId: string,
    userId: string
  ): Promise<{ message: string } | { error: string; status: number }> {
    const userAchievement = await UserAchievement.query()
      .where('id', userAchievementId)
      .where('user_id', userId)
      .first()

    if (!userAchievement) {
      return { error: 'User achievement not found', status: 404 }
    }

    await userAchievement.delete()
    return { message: 'Achievement tracking removed successfully' }
  }

  async getUserStats(userId: string): Promise<{
    total: number
    unlocked: number
    inProgress: number
    completionPercentage: number
  }> {
    const achievements = await UserAchievement.query().where('user_id', userId)

    const total = achievements.length
    const unlocked = achievements.filter((a) => a.unlockedAt !== null).length
    const inProgress = total - unlocked
    const completionPercentage = total > 0 ? Math.round((unlocked / total) * 100) : 0

    return {
      total,
      unlocked,
      inProgress,
      completionPercentage,
    }
  }

  async resetProgress(
    userAchievementId: string
  ): Promise<UserAchievement | { error: string; status: number }> {
    const trx = await db.connection().transaction()

    try {
      const userAchievement = await UserAchievement.query({ client: trx }).where(
        'id',
        userAchievementId
      ).first()

      if (!userAchievement) {
        await trx.rollback()
        return { error: 'User achievement not found', status: 404 }
      }

      userAchievement.currentProgress = 0
      userAchievement.unlockedAt = null
      userAchievement.currentTier = 1

      await userAchievement.save()
      await trx.commit()

      await userAchievement.load('achievement')

      return userAchievement
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
