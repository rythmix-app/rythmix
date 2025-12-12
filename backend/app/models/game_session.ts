import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import Game from '#models/game'
import { ApiProperty } from '@foadonis/openapi/decorators'

// Type pour la structure d'un joueur
export interface PlayerData {
  userId: string
  status: string
  score: number
  expGained: number
  rank: number
}

export default class GameSession extends BaseModel {
  @ApiProperty({
    description: 'Game session unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @column({ isPrimary: true })
  declare id: string

  @ApiProperty({ description: 'Associated game ID', example: 1 })
  @column()
  declare gameId: number

  @ApiProperty({
    description: 'Session status',
    enum: ['pending', 'active', 'completed'],
    example: 'active',
  })
  @column()
  declare status: string

  @ApiProperty({
    description: 'Array of players in the session',
    example: [
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'playing',
        score: 1500,
        expGained: 120,
        rank: 1,
      },
    ],
  })
  @column({
    prepare: (value: PlayerData[]) => JSON.stringify(value),
    consume: (value: string) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare players: PlayerData[]

  @ApiProperty({
    description: 'Game-specific data (JSON)',
    example: { currentRound: 3, maxRounds: 10 },
  })
  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare gameData: any

  @belongsTo(() => Game)
  declare game: BelongsTo<typeof Game>

  @ApiProperty({ description: 'Session creation timestamp' })
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @ApiProperty({ description: 'Last update timestamp' })
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(gameSession: GameSession) {
    gameSession.id = randomUUID()
  }
}
