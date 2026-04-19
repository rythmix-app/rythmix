import type { HttpContext } from '@adonisjs/core/http'
import { FavoriteGameService } from '#services/favorite_game_service'
import FavoriteGame from '#models/favorite_game'
import { inject } from '@adonisjs/core'
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiSecurity,
} from '@foadonis/openapi/decorators'

@inject()
export default class FavoriteGamesController {
  constructor(private favoriteGameService: FavoriteGameService) {}

  @ApiOperation({
    summary: 'List all favorite games (Admin only)',
    description: 'Get a list of all favorite games from all users',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'List of favorite games retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 500, description: 'Error while fetching favorite games' })
  public async index({ response }: HttpContext) {
    try {
      const favoriteGames = await this.favoriteGameService.getAll()
      return response.json({ favoriteGames })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching favorite games' })
    }
  }

  @ApiOperation({
    summary: 'Get my favorite games',
    description: "Get the authenticated user's favorite games with full game details",
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'User favorite games retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Error while fetching favorite games' })
  public async myFavorites({ auth, response }: HttpContext) {
    try {
      const userId = auth.user!.id
      const favoriteGames = await this.favoriteGameService.getUserFavorites(userId)
      return response.json({ favoriteGames })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching favorite games' })
    }
  }

  @ApiOperation({
    summary: 'Add a game to favorites',
    description: "Add a game to the authenticated user's favorite games collection",
  })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Game ID to add to favorites',
    required: true,
    schema: {
      type: 'object',
      required: ['gameId'],
      properties: {
        gameId: { type: 'integer', example: 1, description: 'ID of the game to favorite' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Game added to favorites successfully' })
  @ApiResponse({ status: 400, description: 'Cannot favorite a disabled game' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  @ApiResponse({ status: 409, description: 'Game is already in favorites' })
  @ApiResponse({ status: 500, description: 'Error while adding favorite' })
  public async create({ auth, request, response }: HttpContext) {
    try {
      const userId = auth.user!.id
      const { gameId } = request.only(['gameId'])

      if (!gameId) {
        return response.status(400).json({ message: 'gameId is required' })
      }

      const result = await this.favoriteGameService.addFavorite(userId, gameId)

      if (!(result instanceof FavoriteGame)) {
        return response.status(result.status || 500).json({ message: result.error })
      }

      return response.status(201).json({ favoriteGame: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while adding game to favorites' })
    }
  }

  @ApiOperation({
    summary: 'Remove a game from favorites by favorite ID',
    description: 'Remove a game from favorites using the favorite record ID',
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Favorite game ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'Game removed from favorites successfully' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  @ApiResponse({ status: 500, description: 'Error while removing favorite' })
  public async delete({ auth, params, response }: HttpContext) {
    try {
      const userId = auth.user!.id
      const result = await this.favoriteGameService.removeFavorite(params.id, userId)

      if ((result as any).error) {
        return response
          .status((result as any).status || 500)
          .json({ message: (result as any).error })
      }

      return response.json({ message: (result as any).message })
    } catch (error) {
      return response.status(500).json({ message: 'Error while removing game from favorites' })
    }
  }

  @ApiOperation({
    summary: 'Remove a game from favorites by game ID',
    description: 'Remove a game from favorites using the game ID (more intuitive)',
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'gameId', description: 'Game ID', required: true })
  @ApiResponse({ status: 200, description: 'Game removed from favorites successfully' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  @ApiResponse({ status: 500, description: 'Error while removing favorite' })
  public async deleteByGameId({ auth, params, response }: HttpContext) {
    try {
      const userId = auth.user!.id
      const gameId = Number.parseInt(params.gameId)

      if (Number.isNaN(gameId)) {
        return response.status(400).json({ message: 'Invalid game ID' })
      }

      const result = await this.favoriteGameService.removeFavoriteByGameId(userId, gameId)

      if ((result as any).error) {
        return response
          .status((result as any).status || 500)
          .json({ message: (result as any).error })
      }

      return response.json({ message: (result as any).message })
    } catch (error) {
      return response.status(500).json({ message: 'Error while removing game from favorites' })
    }
  }
}
