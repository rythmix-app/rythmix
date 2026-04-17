import GameSession from '#models/game_session'
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
    return GameSession.query().where('game_id', gameId)
  }

  public async getByStatus(status: string) {
    return GameSession.query().where('status', status)
  }

  public async getByUserId(userId: string, status?: string) {
    const query = GameSession.query()
      .whereRaw('players::jsonb @> ?::jsonb', [JSON.stringify([{ userId }])])
      .preload('game')
    if (status) {
      query.where('status', status)
    }
    return query.orderBy('created_at', 'desc')
  }

  public async getByUserIdAndGameId(userId: string, gameId: number, status?: string) {
    return GameSession.query()
      .whereRaw('players::jsonb @> ?::jsonb', [JSON.stringify([{ userId }])])
      .where('game_id', gameId)
      .if(status, (query) => query.where('status', status!))
      .preload('game')
      .orderBy('created_at', 'desc')
  }

  public async getGameHistory(
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

  public async getGameStats(userId: string, gameId: number) {
    const sessions = await this.getByUserIdAndGameId(userId, gameId, GameSessionStatus.Completed)

    if (sessions.length === 0) {
      return {
        totalPlayed: 0,
        bestScore: 0,
        averageScore: 0,
        averageTimeElapsed: 0,
        lastPlayedAt: null,
      }
    }

    const totalPlayed = sessions.length
    const bestScore = Math.max(...sessions.map((s) => Number(s.gameData?.score ?? 0)))
    const averageScore =
      sessions.reduce((sum, s) => sum + Number(s.gameData?.score ?? 0), 0) / totalPlayed
    const averageTimeElapsed =
      sessions.reduce((sum, s) => sum + Number(s.gameData?.timeElapsed ?? 0), 0) / totalPlayed
    const lastPlayedAt = sessions[0].createdAt.toISO()

    return {
      totalPlayed,
      bestScore,
      averageScore: Math.round(averageScore * 100) / 100,
      averageTimeElapsed: Math.round(averageTimeElapsed * 100) / 100,
      lastPlayedAt,
    }
  }

  public async getMyActiveSessionByGameId(userId: string, gameId: number) {
    return this.getByUserIdAndGameId(userId, gameId, GameSessionStatus.Active)
  }
}

export default GameSessionService
