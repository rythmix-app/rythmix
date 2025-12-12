import GameSession from '#models/game_session'

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

    gameSession.merge(payload)
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
}

export default GameSessionService
