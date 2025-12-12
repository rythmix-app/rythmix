// TypeScript
import type { HttpContext } from '@adonisjs/core/http'
import { AchievementService } from '#services/achievement_service'
import Achievement from '#models/achievement'
import { inject } from '@adonisjs/core'
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@foadonis/openapi/decorators'

@inject()
export default class AchievementsController {
  constructor(private achievementService: AchievementService) {}

  @ApiOperation({ summary: 'List all achievements', description: 'Get a list of all achievements in the system' })
  @ApiResponse({ status: 200, description: 'List of achievements retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Error while fetching achievements' })
  public async index({ response }: HttpContext) {
    try {
      const achievements = await this.achievementService.getAll()
      return response.json({ achievements })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching achievements' })
    }
  }

  @ApiOperation({ summary: 'Create a new achievement', description: 'Create a new achievement with description and type' })
  @ApiBody({
    description: 'Achievement data',
    required: true,
    schema: {
      type: 'object',
      required: ['description', 'type'],
      properties: {
        description: { type: 'string', minLength: 1, example: 'Complete 10 games' },
        type: { type: 'string', minLength: 1, example: 'games_completed' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Achievement created successfully' })
  @ApiResponse({ status: 500, description: 'Error while creating achievement' })
  public async create({ request, response }: HttpContext) {
    try {
      const result = await this.achievementService.createAchievement(
        request.only(['description', 'type'])
      )

      if (!(result instanceof Achievement)) {
        return response
          .status((result as any).status || 500)
          .json({ message: (result as any).error })
      }

      return response.status(201).json({ achievement: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while creating achievement' })
    }
  }

  @ApiOperation({ summary: 'Get achievement by ID', description: 'Retrieve a specific achievement by its ID' })
  @ApiParam({ name: 'id', description: 'Achievement ID', required: true })
  @ApiResponse({ status: 200, description: 'Achievement found' })
  @ApiResponse({ status: 404, description: 'Achievement not found' })
  @ApiResponse({ status: 500, description: 'Error while fetching achievement' })
  public async show({ params, response }: HttpContext) {
    try {
      const achievement = await this.achievementService.getById(params.id)
      if (!achievement) {
        return response.status(404).json({ message: 'Achievement not found' })
      }
      return response.json({ achievement })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching achievement' })
    }
  }

  @ApiOperation({ summary: 'Update achievement', description: 'Update achievement description and/or type' })
  @ApiParam({ name: 'id', description: 'Achievement ID', required: true })
  @ApiBody({
    description: 'Achievement data to update',
    required: true,
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string', minLength: 1, example: 'Complete 10 games' },
        type: { type: 'string', minLength: 1, example: 'games_completed' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Achievement updated successfully' })
  @ApiResponse({ status: 404, description: 'Achievement not found' })
  @ApiResponse({ status: 500, description: 'Error while updating achievement' })
  public async update({ params, request, response }: HttpContext) {
    try {
      const result = await this.achievementService.updateAchievement(
        params.id,
        request.only(['description', 'type'])
      )

      if (!(result instanceof Achievement)) {
        return response
          .status((result as any).status || 500)
          .json({ message: (result as any).error })
      }

      return response.json({ achievement: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while updating achievement' })
    }
  }

  @ApiOperation({ summary: 'Delete achievement', description: 'Delete an achievement permanently' })
  @ApiParam({ name: 'id', description: 'Achievement ID', required: true })
  @ApiResponse({ status: 200, description: 'Achievement deleted successfully' })
  @ApiResponse({ status: 404, description: 'Achievement not found' })
  @ApiResponse({ status: 500, description: 'Error while deleting achievement' })
  public async delete({ params, response }: HttpContext) {
    try {
      const result = await this.achievementService.deleteAchievement(params.id)
      if ((result as any).error) {
        return response
          .status((result as any).status || 500)
          .json({ message: (result as any).error })
      }
      // service returns a message on success
      return response.json({ message: (result as any).message })
    } catch (error) {
      return response.status(500).json({ message: 'Error while deleting achievement' })
    }
  }
}
