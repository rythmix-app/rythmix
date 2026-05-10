import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { errors } from '@vinejs/vine'
import { ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import { MeActivitiesService } from '#services/me_activities_service'
import { listActivitiesValidator } from '#validators/me_activities_validator'

const DEFAULT_LIMIT = 5

@inject()
export default class MeActivitiesController {
  constructor(private readonly meActivitiesService: MeActivitiesService) {}

  @ApiOperation({
    summary: 'List my recent activities',
    description:
      'Returns the latest user events (completed game sessions + liked tracks) sorted by date desc.',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Activities returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Invalid query parameters' })
  async index({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { limit } = await request.validateUsing(listActivitiesValidator, {
        data: request.qs(),
      })

      const activities = await this.meActivitiesService.getRecentActivities(
        user.id,
        limit ?? DEFAULT_LIMIT
      )

      return response.ok({ activities })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }
      return response.internalServerError({ message: 'Error while fetching activities' })
    }
  }
}
