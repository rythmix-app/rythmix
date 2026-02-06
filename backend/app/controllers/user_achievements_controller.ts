import type { HttpContext } from '@adonisjs/core/http'
import { UserAchievementService } from '#services/user_achievement_service'
import UserAchievement from '#models/user_achievement'
import { inject } from '@adonisjs/core'
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@foadonis/openapi/decorators'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class UserAchievementsController {
  constructor(private userAchievementService: UserAchievementService) {}

  @ApiOperation({ summary: 'Get current user achievements' })
  @ApiResponse({ status: 200, description: 'User achievements retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async myAchievements({ auth, response }: HttpContext) {
    try {
      const userId = auth.user!.id
      const userAchievements = await this.userAchievementService.getUserAchievements(userId)
      return response.json({ userAchievements })
    } catch (error) {
      logger.error('Failed to retrieve user achievements:', error)
      return response.status(500).json({ message: 'Failed to retrieve user achievements' })
    }
  }

  @ApiOperation({ summary: 'Get all user achievements (Admin only)' })
  @ApiResponse({ status: 200, description: 'All user achievements retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async index({ response }: HttpContext) {
    try {
      const userAchievements = await this.userAchievementService.getAll()
      return response.json({ userAchievements })
    } catch (error) {
      logger.error('Failed to retrieve user achievements:', error)
      return response.status(500).json({ message: 'Failed to retrieve user achievements' })
    }
  }

  @ApiOperation({ summary: 'Start tracking an achievement' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        achievementId: { type: 'number' },
        requiredProgress: { type: 'number', nullable: true },
      },
      required: ['achievementId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Achievement tracking started successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Achievement not found' })
  @ApiResponse({ status: 409, description: 'Already tracking this achievement' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create({ auth, request, response }: HttpContext) {
    try {
      const { achievementId, requiredProgress } = request.only([
        'achievementId',
        'requiredProgress',
      ])

      if (!achievementId) {
        return response.status(400).json({ message: 'achievementId is required' })
      }
      let validatedRequiredProgress: number | undefined

      if (requiredProgress !== undefined && requiredProgress !== null) {
        const parsed = Number(requiredProgress)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return response
            .status(400)
            .json({ message: 'requiredProgress must be a positive number' })
        }
        validatedRequiredProgress = parsed
      }

      const userId = auth.user!.id
      const result = await this.userAchievementService.startTracking(
        userId,
        achievementId,
        validatedRequiredProgress
      )

      if (!(result instanceof UserAchievement)) {
        return response.status(result.status || 500).json({ message: result.error })
      }

      return response.status(201).json({ userAchievement: result })
    } catch (error) {
      logger.error('Failed to start tracking achievement:', error)
      return response.status(500).json({ message: 'Failed to start tracking achievement' })
    }
  }

  @ApiOperation({ summary: 'Update achievement progress' })
  @ApiParam({ name: 'id', required: true, schema: { type: 'string' } })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
      },
      required: ['amount'],
    },
  })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User achievement not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateProgress({ auth, params, request, response }: HttpContext) {
    try {
      const { amount } = request.only(['amount'])

      if (amount === undefined || amount === null || typeof amount !== 'number' || amount <= 0) {
        return response.status(400).json({ message: 'Amount must be positive' })
      }

      const userId = auth.user!.id
      const result = await this.userAchievementService.incrementProgress(params.id, userId, amount)

      if (!(result instanceof UserAchievement)) {
        return response.status(result.status || 500).json({ message: result.error })
      }

      return response.json({ userAchievement: result })
    } catch (error) {
      logger.error('Failed to update progress:', error)
      return response.status(500).json({ message: 'Failed to update progress' })
    }
  }

  @ApiOperation({ summary: 'Remove achievement tracking' })
  @ApiParam({ name: 'id', required: true, schema: { type: 'string' } })
  @ApiResponse({ status: 200, description: 'Achievement tracking removed successfully' })
  @ApiResponse({ status: 404, description: 'User achievement not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async delete({ auth, params, response }: HttpContext) {
    try {
      const userId = auth.user!.id
      const result = await this.userAchievementService.removeTracking(params.id, userId)

      if ('error' in result) {
        return response.status(result.status || 500).json({ message: result.error })
      }

      return response.json(result)
    } catch (error) {
      logger.error('Failed to remove achievement tracking:', error)
      return response.status(500).json({ message: 'Failed to remove achievement tracking' })
    }
  }

  @ApiOperation({ summary: 'Get user achievement statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        unlocked: { type: 'number' },
        inProgress: { type: 'number' },
        completionPercentage: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async stats({ auth, response }: HttpContext) {
    try {
      const userId = auth.user!.id
      const stats = await this.userAchievementService.getUserStats(userId)
      return response.json(stats)
    } catch (error) {
      logger.error('Failed to retrieve statistics:', error)
      return response.status(500).json({ message: 'Failed to retrieve statistics' })
    }
  }

  @ApiOperation({ summary: 'Reset achievement progress (Admin only)' })
  @ApiParam({ name: 'id', required: true, schema: { type: 'string' } })
  @ApiResponse({ status: 200, description: 'Progress reset successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User achievement not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async reset({ params, response }: HttpContext) {
    try {
      const result = await this.userAchievementService.resetProgress(params.id)

      if (!(result instanceof UserAchievement)) {
        return response.status(result.status || 500).json({ message: result.error })
      }

      return response.json({ userAchievement: result })
    } catch (error) {
      logger.error('Failed to reset progress:', error)
      return response.status(500).json({ message: 'Failed to reset progress' })
    }
  }
}
