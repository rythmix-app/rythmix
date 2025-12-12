import type { HttpContext } from '@adonisjs/core/http'
import { GameSessionService } from '#services/game_session_service'
import GameSession from '#models/game_session'
import { inject } from '@adonisjs/core'

@inject()
export default class GameSessionsController {
  constructor(private gameSessionService: GameSessionService) {}

  public async index({ response }: HttpContext) {
    try {
      const gameSessions = await this.gameSessionService.getAll()
      return response.json({ message: 'List of game sessions', data: gameSessions })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game sessions' })
    }
  }

  public async create({ request, response }: HttpContext) {
    try {
      const payload = request.only(['gameId', 'status', 'players', 'gameData'])
      const result = await this.gameSessionService.createGameSession(payload)
      if (!(result instanceof GameSession)) {
        return response.status(result.status || 500).json({ message: result.error })
      }
      return response.status(201).json({ message: 'Game session created', data: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while creating game session' })
    }
  }

  public async show({ params, response }: HttpContext) {
    try {
      const gameSession = await this.gameSessionService.getById(params.id)
      if (!gameSession) {
        return response.status(404).json({ message: 'Game session not found' })
      }
      return response.json({
        message: `Game session details for ID: ${params.id}`,
        data: gameSession,
      })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game session' })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    try {
      const result = await this.gameSessionService.updateGameSession(
        params.id,
        request.only(['gameId', 'status', 'players', 'gameData'])
      )
      if (!(result instanceof GameSession)) {
        return response.status(result.status || 500).json({ message: result.error })
      }
      return response.json({ message: `Game session ${params.id} updated`, data: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while updating game session' })
    }
  }

  public async delete({ params, response }: HttpContext) {
    try {
      const result = await this.gameSessionService.deleteGameSession(params.id)

      if ((result as any).error) {
        return response
          .status((result as any).status || 500)
          .json({ message: (result as any).error })
      }

      return response.json({ message: (result as any).message })
    } catch (error) {
      return response.status(500).json({ message: 'Error while deleting game session' })
    }
  }

  public async getByGame({ params, response }: HttpContext) {
    try {
      const gameSessions = await this.gameSessionService.getByGameId(params.gameId)
      return response.json({
        message: `Game sessions for game ID: ${params.gameId}`,
        data: gameSessions,
      })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game sessions' })
    }
  }

  public async getByStatus({ params, response }: HttpContext) {
    try {
      const gameSessions = await this.gameSessionService.getByStatus(params.status)
      return response.json({
        message: `Game sessions with status: ${params.status}`,
        data: gameSessions,
      })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game sessions' })
    }
  }
}
