// TypeScript
import type { HttpContext } from '@adonisjs/core/http'
import { AchievementService } from '#services/achievement_service'
import Achievement from '#models/achievement'
import { inject } from '@adonisjs/core'

@inject()
export default class AchievementsController {
  constructor(private achievementService: AchievementService) {}

  public async index({ response }: HttpContext) {
    try {
      const achievements = await this.achievementService.getAll()
      return response.json({ message: 'List of achievements', data: achievements })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching achievements' })
    }
  }

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

      return response.status(201).json({ message: 'Achievement created', data: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while creating achievement' })
    }
  }

  public async show({ params, response }: HttpContext) {
    try {
      const achievement = await this.achievementService.getById(params.id)
      if (!achievement) {
        return response.status(404).json({ message: 'Achievement not found' })
      }
      const payload = {
        message: `Achievement details for ID: ${params.id}`,
        data: achievement,
      }
      return response.json(payload)
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching achievement' })
    }
  }

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

      return response.json({ message: 'Achievement updated', data: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while updating achievement' })
    }
  }

  public async delete({ params, response }: HttpContext) {
    try {
      const result = await this.achievementService.deleteAchievement(params.id)
      if ((result as any).error) {
        return response
          .status((result as any).status || 500)
          .json({ message: (result as any).error })
      }
      // service returns message on success
      return response.json({ message: (result as any).message })
    } catch (error) {
      return response.status(500).json({ message: 'Error while deleting achievement' })
    }
  }
}
