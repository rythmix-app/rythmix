import type { HttpContext } from '@adonisjs/core/http'
import { GameService } from '#services/game_service'
import Game from '#models/game'
import { inject } from '@adonisjs/core'
import { ApiOperation, ApiResponse, ApiParam, ApiSecurity, ApiBody } from '@foadonis/openapi/decorators'

@inject()
export default class GamesController {
  constructor(private readonly gameService: GameService) {}

  @ApiOperation({ summary: 'List all games', description: 'Get a list of all available games' })
  @ApiResponse({ status: 200, description: 'List of games retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Failed to fetch games' })
  public async index({ response }: HttpContext) {
    try {
      const games = await this.gameService.getAll()
      return response.json({ games })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'Failed to fetch games', error: error.message || error })
    }
  }

  @ApiOperation({ summary: 'Create a new game', description: 'Create a new game (admin only)' })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Game data',
    required: true,
    schema: {
      type: 'object',
      required: ['name', 'description'],
      properties: {
        name: { type: 'string', minLength: 1, example: 'Guess the Song' },
        description: { type: 'string', example: 'Players guess songs from audio clips' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 500, description: 'Error creating game' })
  public async create({ request, response }: HttpContext) {
    try {
      const result = await this.gameService.createGame(request.only(['name', 'description']))
      if (!(result instanceof Game)) {
        return response.status(result.status || 500).json({ message: result.error })
      }
      return response.status(201).json({ game: result })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'An unexpected error occurred', error: error.message })
    }
  }

  @ApiOperation({ summary: 'Get game by ID', description: 'Retrieve a specific game by its ID' })
  @ApiParam({ name: 'id', description: 'Game ID', required: true })
  @ApiResponse({ status: 200, description: 'Game found' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @ApiResponse({ status: 500, description: 'Error retrieving game' })
  public async show({ params, response }: HttpContext) {
    try {
      const gameId = params.id
      const game = await this.gameService.getById(gameId)
      if (!game) {
        return response.status(404).json({ message: 'Game not found' })
      }
      return response.json({ game })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'An error occurred while retrieving the game', error: error.message })
    }
  }

  @ApiOperation({ summary: 'Update game', description: 'Update game information (admin only)' })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Game ID', required: true })
  @ApiBody({
    description: 'Game data to update',
    required: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, example: 'Guess the Song' },
        description: { type: 'string', example: 'Players guess songs from audio clips' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Game updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @ApiResponse({ status: 500, description: 'Error updating game' })
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
      return response.json({ game: result })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'An unexpected error occurred', error: error?.message })
    }
  }

  @ApiOperation({ summary: 'Delete game', description: 'Delete a game (admin only)' })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Game ID', required: true })
  @ApiResponse({ status: 200, description: 'Game deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @ApiResponse({ status: 500, description: 'Error deleting game' })
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
