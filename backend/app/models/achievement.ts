import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import UserAchievement from '#models/user_achievement'
import { ApiProperty } from '@foadonis/openapi/decorators'
import { AchievementType } from '#enums/achievement_type'

export default class Achievement extends BaseModel {
  @ApiProperty({ description: 'Achievement unique identifier', example: 1 })
  @column({ isPrimary: true })
  declare id: number

  @ApiProperty({ description: 'Achievement name', example: 'Gagnant invaincu' })
  @column()
  declare name: string

  @ApiProperty({
    description: 'Achievement description',
    example: 'Gagner 10 parties consécutives',
    nullable: true,
  })
  @column()
  declare description: string | null

  @ApiProperty({
    description: 'Achievement type',
    enum: AchievementType,
    example: AchievementType.FirstWin,
  })
  @column()
  declare type: AchievementType

  @ApiProperty({ description: 'Achievement icon', example: 'trophy', nullable: true })
  @column()
  declare icon: string | null

  @hasMany(() => UserAchievement)
  declare achievementUsers: HasMany<typeof UserAchievement>

  @ApiProperty({ description: 'Achievement creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp' })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
