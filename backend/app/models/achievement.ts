import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import UserAchievement from '#models/user_achievement'
import { ApiProperty } from '@foadonis/openapi/decorators'

export default class Achievement extends BaseModel {
  @ApiProperty({ description: 'Achievement unique identifier', example: 1 })
  @column({ isPrimary: true })
  declare id: number

  @ApiProperty({
    description: 'Achievement description',
    example: 'Gagner 10 parties consécutives',
    nullable: true,
  })
  @column()
  declare description: string | null

  @ApiProperty({ description: 'Achievement type', example: 'winning_streak' })
  @column()
  declare type: string

  @hasMany(() => UserAchievement)
  declare achievementUsers: HasMany<typeof UserAchievement>

  @ApiProperty({ description: 'Achievement creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp' })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
