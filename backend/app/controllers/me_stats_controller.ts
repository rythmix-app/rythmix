import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { MeStatsService } from '#services/me_stats_service'
import { ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'

@inject()
export default class MeStatsController {
  constructor(private readonly meStatsService: MeStatsService) {}

  @ApiOperation({
    summary: 'Get current user statistics',
    description:
      'Retrieve aggregated statistics for the authenticated user (swipes, games played, streak)',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalSwipes: { type: 'number', example: 142 },
        gamesPlayed: { type: 'number', example: 23 },
        streak: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async index({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const stats = await this.meStatsService.getStats(user.id)
      return response.json({ data: stats })
    } catch (error) {
      return response.status(500).json({ message: 'Internal server error' })
    }
  }
}
