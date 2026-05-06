import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { errors } from '@vinejs/vine'
import { ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import { RecommendationService } from '#services/recommendation_service'
import { swipemixFeedValidator } from '#validators/swipemix_feed_validator'

@inject()
export default class SwipemixFeedController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @ApiOperation({
    summary: 'Get personalized SwipeMix feed',
    description:
      'Returns a personalized feed of Deezer tracks built from the current user signals (Spotify top artists, recent likes, onboarding selection). Falls back to country charts when no signal is available. Already-swiped tracks are excluded. Familiar/discovery ratio is dynamic: 80/20 on the first 5 tracks, then 60/40.',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Personalized feed returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Invalid query params' })
  @ApiResponse({ status: 502, description: 'Failed to build personalized feed' })
  async index({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const qs = await request.validateUsing(swipemixFeedValidator, {
        data: request.qs(),
      })

      const tracks = await this.recommendationService.getPersonalizedFeed(user.id, qs)
      return response.ok({ tracks })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }
      logger.error({ err: error }, 'Failed to build personalized SwipeMix feed')
      return response.status(502).json({ message: 'Failed to build personalized feed' })
    }
  }
}
