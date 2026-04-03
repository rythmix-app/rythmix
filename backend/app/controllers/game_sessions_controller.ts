import type { HttpContext } from '@adonisjs/core/http'
import { GameSessionService } from '#services/game_session_service'
import GameSession from '#models/game_session'
import { inject } from '@adonisjs/core'
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
} from '@foadonis/openapi/decorators'
import { GameSessionStatus } from '#enums/game_session_status'

@inject()
export default class GameSessionsController {
  constructor(private gameSessionService: GameSessionService) {}

  @ApiOperation({
    summary: 'List all game sessions',
    description: 'Get a list of all game sessions',
  })
  @ApiResponse({ status: 200, description: 'List of game sessions retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Error while fetching game sessions' })
  public async index({ response }: HttpContext) {
    try {
      const gameSessions = await this.gameSessionService.getAll()
      return response.json({ gameSessions })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game sessions' })
    }
  }

  @ApiOperation({
    summary: 'Create a new game session',
    description: 'Create a new game session with game ID, status, players, and game data',
  })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Game session data',
    required: true,
    schema: {
      type: 'object',
      required: ['gameId', 'status', 'players', 'gameData'],
      properties: {
        gameId: { type: 'integer', example: 558 },
        status: {
          type: 'string',
          enum: Object.values(GameSessionStatus),
          example: GameSessionStatus.Active,
        },
        players: {
          type: 'array',
          items: {
            type: 'object',
            required: ['userId'],
            properties: {
              userId: {
                type: 'string',
                example: '46a42728-1fe2-4b3a-afd1-1fb9b0fe84f8',
              },
            },
          },
          example: [{ userId: '46a42728-1fe2-4b3a-afd1-1fb9b0fe84f8' }],
        },
        gameData: {
          type: 'object',
          example: {
            album: {
              id: 657848951,
              title: 'BDLM VOL.1',
              coverUrl:
                'https://cdn-images.dzcdn.net/images/cover/af056d5fa6167cfd1917dc0e08c11083/1000x1000-000000-80-0-0.jpg',
              artistName: 'Tiakola',
              totalTracks: 18,
            },
            genre: { id: 116, name: 'Rap/Hip Hop' },
            score: 0,
            answers: [],
            maxScore: 18,
            startedAt: '2026-03-17T21:05:27.989Z',
            completedAt: null,
            timeElapsed: 0,
          },
        },
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
      return response.status(201).json({ gameSession: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while creating game session' })
    }
  }

  @ApiOperation({
    summary: 'Get game session by ID',
    description: 'Retrieve a specific game session by its ID (UUID)',
  })
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
        gameSession,
      })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game session' })
    }
  }

  @ApiOperation({
    summary: 'Update game session',
    description: 'Update game session status, players, or game data',
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Game session ID (UUID)', required: true })
  @ApiBody({
    description: 'Game session data to update',
    required: true,
    schema: {
      type: 'object',
      properties: {
        gameId: { type: 'integer', example: 1 },
        status: {
          type: 'string',
          enum: Object.values(GameSessionStatus),
          example: GameSessionStatus.Active,
        },
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
      return response.json(result)
    } catch (error) {
      return response.status(500).json({ message: 'Error while updating game session' })
    }
  }

  @ApiOperation({
    summary: 'Delete game session',
    description: 'Delete a game session permanently',
  })
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

  @ApiOperation({
    summary: 'Get sessions by game ID',
    description: 'Retrieve all game sessions for a specific game',
  })
  @ApiParam({ name: 'gameId', description: 'Game ID', required: true })
  @ApiResponse({ status: 200, description: 'Game sessions retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Error while fetching game sessions' })
  public async getByGame({ params, response }: HttpContext) {
    try {
      const gameSessions = await this.gameSessionService.getByGameId(params.gameId)
      return response.json({ gameSessions })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game sessions' })
    }
  }

  @ApiOperation({
    summary: 'Get my game sessions',
    description:
      'Retrieve all game sessions for the authenticated user, optionally filtered by status',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Game sessions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Error while fetching game sessions' })
  public async mySessions({ auth, request, response }: HttpContext) {
    try {
      const userId = auth.user!.id
      const status = request.qs().status as string | undefined
      const gameSessions = await this.gameSessionService.getMySessionsByUserId(userId, status)
      return response.json({ gameSessions })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game sessions' })
    }
  }

  @ApiOperation({
    summary: 'Get my active session for a game',
    description:
      'Retrieve the active game session of the authenticated user for a specific game, or null if none exists. If multiple active sessions exist, returns the most recent one.',
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'gameId', description: 'Game ID', required: true })
  @ApiResponse({ status: 200, description: 'Active game session or null' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Error while fetching active game session' })
  public async myActiveSession({ auth, params, response }: HttpContext) {
    try {
      const userId = auth.user!.id
      const gameId = Number(params.gameId)
      const gameSession = await this.gameSessionService.getMyActiveSessionByGameId(userId, gameId)
      return response.json({ gameSession: gameSession ?? null })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching active game session' })
    }
  }

  @ApiOperation({
    summary: 'Get sessions by status',
    description:
      'Retrieve all game sessions with a specific status (pending, active, completed, canceled)',
  })
  @ApiParam({
    name: 'status',
    description: 'Session status (pending, active, completed, canceled)',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Game sessions retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Error while fetching game sessions' })
  public async getByStatus({ params, response }: HttpContext) {
    try {
      const gameSessions = await this.gameSessionService.getByStatus(params.status)
      return response.json({ gameSessions })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching game sessions' })
    }
  }
}
