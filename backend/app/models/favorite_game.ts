import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Game from '#models/game'
import { randomUUID } from 'node:crypto'
import { ApiProperty } from '@foadonis/openapi/decorators'

export default class FavoriteGame extends BaseModel {
  @ApiProperty({
    description: 'Favorite game unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @column({ isPrimary: true })
  declare id: string

  @ApiProperty({
    description: 'User ID who favorited the game (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @column()
  declare userId: string

  @ApiProperty({ description: 'Game ID that was favorited', example: 1 })
  @column()
  declare gameId: number

  @ApiProperty({ description: 'Creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp' })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Game)
  declare game: BelongsTo<typeof Game>

  @beforeCreate()
  static assignUuid(favoriteGame: FavoriteGame) {
    favoriteGame.id = randomUUID()
  }
}
