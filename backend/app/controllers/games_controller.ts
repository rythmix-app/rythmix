import type { HttpContext } from '@adonisjs/core/http'
import { GameService } from '#services/game_service'
import Game from '#models/game'
import { inject } from '@adonisjs/core'

@inject()
export default class GamesController {
  constructor(private readonly gameService: GameService) {}

  public async index({ response }: HttpContext) {
    try {
      const games = await this.gameService.getAll()
      return response.json({ message: 'List of games', data: games })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'Failed to fetch games', error: error.message || error })
    }
  }

  public async create({ request, response }: HttpContext) {
    try {
      const result = await this.gameService.createGame(request.only(['name', 'description']))
      if (!(result instanceof Game)) {
        return response.status(result.status || 500).json({ message: result.error })
      }
      return response.status(201).json({ message: 'Game created successfully', data: result })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'An unexpected error occurred', error: error.message })
    }
  }

  public async show({ params, response }: HttpContext) {
    try {
      const gameId = params.id
      const game = await this.gameService.getById(gameId)
      if (!game) {
        return response.status(404).json({ message: 'Game not found' })
      }
      return response.json({ message: `Game details for ID: ${gameId}`, data: game })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'An error occurred while retrieving the game', error: error.message })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    try {
      const gameId = params.id
      const result = await this.gameService.updateGame(
        gameId,
        request.only(['name', 'description'])
      )
      if (!(result instanceof Game)) {
        return response.status(result.status || 500).json({ message: result.error })
      }
      return response.json({ message: 'Game updated successfully', data: result })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'An unexpected error occurred', error: error?.message })
    }
  }

  public async destroy({ params, response }: HttpContext) {
    try {
      const gameId = params.id
      const result = await this.gameService.deleteGame(gameId)
      if (result.error) {
        return response.status(result.status).json({ message: result.error })
      }
      return response.json({ message: `Game with ID: ${gameId} deleted successfully` })
    } catch (error) {
      return response.status(500).json({
        message: 'An unexpected error occurred while deleting the game.',
        error: error?.message || error,
      })
    }
  }
}
