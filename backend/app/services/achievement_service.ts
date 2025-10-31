// TypeScript
import Achievement from '#models/achievement'

export class AchievementService {
  public async getAll() {
    return Achievement.query()
  }

  public async getById(achievementId: number | string) {
    return Achievement.query().where('id', achievementId).first()
  }

  public async createAchievement(payload: { description?: string | null; type: string }) {
    const achievement = await Achievement.create(payload)
    return achievement
  }

  public async updateAchievement(
    achievementId: number | string,
    payload: Partial<{ description?: string | null; type?: string }>
  ) {
    const achievement = await Achievement.query().where('id', achievementId).first()
    if (!achievement) {
      return {
        error: 'Achievement not found',
        status: 404,
      }
    }
    achievement.merge(payload)
    await achievement.save()
    return achievement
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
