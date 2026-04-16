import GameSession from '#models/game_session'
import db from '@adonisjs/lucid/services/db'
import { GameSessionStatus } from '#enums/game_session_status'

export class GameSessionService {
  public async getAll() {
    return GameSession.query().preload('game')
  }

  public async getById(gameSessionId: string) {
    return GameSession.query().where('id', gameSessionId).preload('game').first()
  }

  public async createGameSession(payload: {
    gameId: number
    status: string
    players: any
    gameData: any
  }) {
    const playerIds: string[] = Array.isArray(payload.players)
      ? payload.players.map((p: any) => p.userId).filter(Boolean)
      : []

    for (const userId of playerIds) {
      const existing = await GameSession.query()
        .whereRaw('players::jsonb @> ?::jsonb', [JSON.stringify([{ userId }])])
        .where('game_id', payload.gameId)
        .where('status', GameSessionStatus.Active)
        .first()

      if (existing) {
        return {
          error: 'An active session already exists for this game',
          status: 409,
        }
      }
    }

    try {
      const gameSession = await GameSession.create(payload)
      await gameSession.load('game')
      return gameSession
    } catch (error: any) {
      if (error.code === '23503') {
        // Foreign key constraint violation
        return {
          error: 'Game not found',
          status: 404,
        }
      }
      if (error.code === '23505') {
        return {
          error: 'Conflict when creating game session',
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

  public async updateGameSession(gameSessionId: string, payload: Partial<GameSession>) {
    const gameSession = await GameSession.query().where('id', gameSessionId).first()
    if (!gameSession) {
      return {
        error: 'GameSession not found',
        status: 404,
      }
    }

    // Shallow JSON merge on gameData so partial updates from clients don't wipe
    // existing top-level keys (e.g. album, genre, startedAt set at creation time).
    const mergedPayload = { ...payload }
    if (
      payload.gameData !== undefined &&
      payload.gameData !== null &&
      gameSession.gameData &&
      typeof gameSession.gameData === 'object' &&
      !Array.isArray(gameSession.gameData) &&
      typeof payload.gameData === 'object' &&
      !Array.isArray(payload.gameData)
    ) {
      mergedPayload.gameData = { ...gameSession.gameData, ...payload.gameData }
    }

    gameSession.merge(mergedPayload)
    try {
      await gameSession.save()
      await gameSession.load('game')
      return gameSession
    } catch (error: any) {
      if (error.code === '23503') {
        return {
          error: 'Game not found',
          status: 404,
        }
      }
      if (error.code === '23505') {
        return {
          error: 'Conflict when updating game session',
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

  public async deleteGameSession(gameSessionId: string) {
    const gameSession = await GameSession.query().where('id', gameSessionId).first()
    if (!gameSession) {
      return {
        error: 'GameSession not found',
        status: 404,
      }
    }
    await gameSession.delete()
    return { message: `GameSession with ID: ${gameSessionId} deleted successfully` }
  }

  public async getByGameId(gameId: number) {
    return GameSession.query().where('game_id', gameId).preload('game')
  }

  public async getByStatus(status: string) {
    return GameSession.query().where('status', status).preload('game')
  }

  public async getMySessionsByUserId(userId: string, status?: string) {
    const query = GameSession.query()
      .whereRaw('players::jsonb @> ?::jsonb', [JSON.stringify([{ userId }])])
      .preload('game')
    if (status) {
      query.where('status', status)
    }
    return query.orderBy('created_at', 'desc')
  }

  public async getMyGameHistory(
    userId: string,
    gameId: number,
    status?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const allowedStatuses = [GameSessionStatus.Completed, GameSessionStatus.Canceled]
    const query = GameSession.query()
      .whereRaw('players::jsonb @> ?::jsonb', [JSON.stringify([{ userId }])])
      .where('game_id', gameId)
      .preload('game')
      .orderBy('created_at', 'desc')

    if (status) {
      query.where('status', status)
    } else {
      query.whereIn('status', allowedStatuses)
    }

    return query.paginate(page, limit)
  }

  public async getMyGameStats(userId: string, gameId: number) {
    const result = await db.rawQuery(
      `SELECT
          COUNT(*)::int AS "totalPlayed",
          COALESCE(MAX((game_data->>'score')::numeric), 0) AS "bestScore",
          COALESCE(
            AVG(
              CASE WHEN (game_data->>'maxScore')::numeric > 0
                THEN (game_data->>'score')::numeric / (game_data->>'maxScore')::numeric * 100
                ELSE 0
              END
            ), 0
          ) AS "averageScore",
          COALESCE(AVG((game_data->>'timeElapsed')::numeric), 0) AS "averageTimeElapsed",
          MAX(created_at) AS "lastPlayedAt"
        FROM game_sessions
        WHERE players::jsonb @> ?::jsonb
          AND game_id = ?
          AND status = ?`,
      [JSON.stringify([{ userId }]), gameId, GameSessionStatus.Completed]
    )

    const row = result.rows[0]
    return {
      totalPlayed: row.totalPlayed ?? 0,
      bestScore: Number(row.bestScore ?? 0),
      averageScore: Math.round(Number(row.averageScore ?? 0) * 100) / 100,
      averageTimeElapsed: Math.round(Number(row.averageTimeElapsed ?? 0) * 100) / 100,
      lastPlayedAt: row.lastPlayedAt ?? null,
    }
  }

  public async getMyActiveSessionByGameId(userId: string, gameId: number) {
    return GameSession.query()
      .whereRaw('players::jsonb @> ?::jsonb', [JSON.stringify([{ userId }])])
      .where('game_id', gameId)
      .where('status', GameSessionStatus.Active)
      .preload('game')
      .orderBy('created_at', 'desc')
      .first()
  }
}

export default GameSessionService
