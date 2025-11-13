import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import Game from '#models/game'

// Type pour la structure d'un joueur
export interface PlayerData {
  userId: string
  status: string
  score: number
  expGained: number
  rank: number
}

// Type pour les données de jeu
export interface GameData {
  classement?: any[]
  settings?: Record<string, any>
  manche?: number
  points?: Record<string, number>
  [key: string]: any
}

export default class GameSession extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare gameId: number

  @column()
  declare status: string

  @column({
    prepare: (value: PlayerData[]) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare players: PlayerData[]

  @column({
    prepare: (value: GameData) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare gameData: GameData

  @belongsTo(() => Game)
  declare game: BelongsTo<typeof Game>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(gameSession: GameSession) {
    gameSession.id = randomUUID()
  }
}