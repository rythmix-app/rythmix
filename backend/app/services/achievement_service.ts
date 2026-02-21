import Achievement from '#models/achievement'
import { AchievementType } from '#enums/achievement_type'

export class AchievementService {
  public async getAll() {
    return Achievement.query()
  }

  public async getById(achievementId: number | string) {
    return Achievement.query().where('id', achievementId).first()
  }

  public async createAchievement(payload: { description?: string | null; type: AchievementType }) {
    try {
      const achievement = await Achievement.create(payload)
      return achievement
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          error: 'Achievement already exists',
          status: 409,
        }
      }
      if (error.code === '22001') {
        return {
          error: 'One or more fields exceed maximum length',
          status: 400,
        }
      }
      throw error
    }
  }

  public async updateAchievement(
    achievementId: number | string,
    payload: Partial<{ description?: string | null; type?: AchievementType }>
  ) {
    const achievement = await Achievement.query().where('id', achievementId).first()
    if (!achievement) {
      return {
        error: 'Achievement not found',
        status: 404,
      }
    }
    achievement.merge(payload)
    try {
      await achievement.save()
      return achievement
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          error: 'Conflict when updating achievement',
          status: 409,
        }
      }
      if (error.code === '22001') {
        return {
          error: 'One or more fields exceed maximum length',
          status: 400,
        }
      }
      throw error
    }
  }

  public async deleteAchievement(achievementId: number | string) {
    const achievement = await Achievement.query().where('id', achievementId).first()
    if (!achievement) {
      return {
        error: 'Achievement not found',
        status: 404,
      }
    }
    await achievement.delete()
    return { message: `Achievement with ID: ${achievementId} deleted successfully` }
  }
}

export default AchievementService
