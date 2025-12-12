import type { HttpContext } from '@adonisjs/core/http'
import { GameSessionService } from '#services/game_session_service'
import GameSession from '#models/game_session'
import { inject } from '@adonisjs/core'
import { ApiOperation, ApiResponse, ApiParam, ApiBody, ApiSecurity } from '@foadonis/openapi/decorators'

@inject()
export default class GameSessionsController {
  constructor(private gameSessionService: GameSessionService) {}

  @ApiOperation({ summary: 'List all game sessions', description: 'Get a list of all game sessions' })
  @ApiResponse({ status: 200, description: 'List of game sessions retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Error while fetching game sessions' })
  public async index({ response }: HttpContext) {
    try {
      const gameSessions = await this.gameSessionService.getAll()
      return response.json({ message: 'List of game sessions', data: gameSessions })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game sessions' })
    }
  }

  @ApiOperation({ summary: 'Create a new game session', description: 'Create a new game session with game ID, status, players, and game data' })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Game session data',
    required: true,
    schema: {
      type: 'object',
      required: ['gameId'],
      properties: {
        gameId: { type: 'integer', example: 1 },
        status: { type: 'string', enum: ['pending', 'active', 'completed'], example: 'pending' },
        players: { type: 'object', example: { player1: 'John', player2: 'Jane' } },
        gameData: { type: 'object', example: { score: 0, round: 1 } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Game session created successfully' })
  @ApiResponse({ status: 500, description: 'Error while creating game session' })
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

  @ApiOperation({ summary: 'Get game session by ID', description: 'Retrieve a specific game session by its ID (UUID)' })
  @ApiParam({ name: 'id', description: 'Game session ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'Game session found' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  @ApiResponse({ status: 500, description: 'Error while fetching game session' })
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

  @ApiOperation({ summary: 'Update game session', description: 'Update game session status, players, or game data' })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Game session ID (UUID)', required: true })
  @ApiBody({
    description: 'Game session data to update',
    required: true,
    schema: {
      type: 'object',
      properties: {
        gameId: { type: 'integer', example: 1 },
        status: { type: 'string', enum: ['pending', 'active', 'completed'], example: 'active' },
        players: { type: 'object', example: { player1: 'John', player2: 'Jane' } },
        gameData: { type: 'object', example: { score: 100, round: 3 } },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Game session updated successfully' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  @ApiResponse({ status: 500, description: 'Error while updating game session' })
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

  @ApiOperation({ summary: 'Delete game session', description: 'Delete a game session permanently' })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Game session ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'Game session deleted successfully' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  @ApiResponse({ status: 500, description: 'Error while deleting game session' })
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

  @ApiOperation({ summary: 'Get sessions by game ID', description: 'Retrieve all game sessions for a specific game' })
  @ApiParam({ name: 'gameId', description: 'Game ID', required: true })
  @ApiResponse({ status: 200, description: 'Game sessions retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Error while fetching game sessions' })
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

  @ApiOperation({ summary: 'Get sessions by status', description: 'Retrieve all game sessions with a specific status (pending, active, completed)' })
  @ApiParam({ name: 'status', description: 'Session status (pending, active, completed)', required: true })
  @ApiResponse({ status: 200, description: 'Game sessions retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Error while fetching game sessions' })
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
