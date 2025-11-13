import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, beforeSave, belongsTo, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Achievement from '#models/achievement'
import { randomUUID } from 'node:crypto'

export default class UserAchievement extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare achievementId: number

  @column()
  declare currentProgress: number

  @column()
  declare requiredProgress: number

  @column()
  declare currentTier: number

  @column()
  declare progressData: Record<string, any>

  @column.dateTime()
  declare unlockedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Achievement)
  declare achievement: BelongsTo<typeof Achievement>

  @beforeCreate()
  static assignUuid(userAchievement: UserAchievement) {
    userAchievement.id = randomUUID()
  }

  @beforeSave()
  static async validateAndAutoUnlock(userAchievement: UserAchievement) {
    if (userAchievement.currentProgress < 0) {
      throw new Error('currentProgress must be greater than or equal to 0')
    }

    if (userAchievement.requiredProgress <= 0) {
      throw new Error('requiredProgress must be greater than 0')
    }

    if (userAchievement.currentTier < 0) {
      throw new Error('currentTier must be greater than or equal to 0')
    }

    if (
      userAchievement.currentProgress >= userAchievement.requiredProgress &&
      !userAchievement.unlockedAt
    ) {
      userAchievement.unlockedAt = DateTime.now()
    }
  }
}
