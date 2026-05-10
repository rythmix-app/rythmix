import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { IANAZone } from 'luxon'
import { MeStatsService } from '#services/me_stats_service'
import { ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'

const TIMEZONE_HEADER = 'x-timezone'
const DEFAULT_TIMEZONE = 'UTC'

@inject()
export default class MeStatsController {
  constructor(private readonly meStatsService: MeStatsService) {}

  @ApiOperation({
    summary: 'Get current user statistics',
    description:
      'Retrieve aggregated statistics for the authenticated user (swipes, games played, streak). Streak is computed in the timezone passed via the X-Timezone header (IANA format, e.g. Europe/Paris). Defaults to UTC.',
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
  public async index({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const timezone = this.resolveTimezone(request.header(TIMEZONE_HEADER))
      const stats = await this.meStatsService.getStats(user.id, timezone)
      return response.json({ data: stats })
    } catch (error) {
      return response.status(500).json({ message: 'Internal server error' })
    }
  }

  private resolveTimezone(raw: string | undefined): string {
    if (!raw) return DEFAULT_TIMEZONE
    return IANAZone.isValidZone(raw) ? raw : DEFAULT_TIMEZONE
  }
}
