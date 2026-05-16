import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { errors } from '@vinejs/vine'
import { ApiBody, ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import { OnboardingService } from '#services/onboarding_service'
import {
  onboardingSuggestionsValidator,
  setOnboardingArtistsValidator,
} from '#validators/onboarding_validator'
import { isServiceError } from '#types/service_error'

@inject()
export default class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @ApiOperation({
    summary: 'Get onboarding status',
    description: 'Returns whether the current user completed the onboarding artist selection.',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Onboarding status returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async status({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const status = await this.onboardingService.getStatus(user.id)
    return response.ok(status)
  }

  @ApiOperation({
    summary: 'List my onboarding artists',
    description: 'Returns the artists the current user picked at onboarding, ordered by rank.',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Artists returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const artists = await this.onboardingService.listArtists(user.id)
    return response.ok({ artists })
  }

  @ApiOperation({
    summary: 'Replace my onboarding artists',
    description:
      'Replaces the user onboarding artist selection in full. Min 3 artists, max 5. Items are persisted in the order received as their rank.',
  })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Deezer artist ids to persist as the user selection',
    required: true,
    schema: {
      type: 'object',
      required: ['deezerArtistIds'],
      properties: {
        deezerArtistIds: {
          type: 'array',
          minItems: 3,
          maxItems: 5,
          items: { type: 'integer', example: 27 },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Selection saved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Invalid payload' })
  async replace({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { deezerArtistIds } = await request.validateUsing(setOnboardingArtistsValidator)

      const result = await this.onboardingService.replaceArtists(user.id, deezerArtistIds)

      if (isServiceError(result)) {
        return response.status(result.status).json({ message: result.error })
      }

      return response.ok({ artists: result })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }
      logger.error({ err: error }, 'Failed to save onboarding artists')
      return response.internalServerError({ message: 'Failed to save onboarding artists' })
    }
  }

  @ApiOperation({
    summary: 'Get artist suggestions for onboarding',
    description:
      'Fetches top artists from Deezer charts (default country: FR) for the onboarding screen. Already-selected artists are excluded.',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Suggestions returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Invalid query params' })
  @ApiResponse({ status: 502, description: 'Deezer upstream error' })
  async suggestions({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const qs = await request.validateUsing(onboardingSuggestionsValidator, {
        data: request.qs(),
      })

      const artists = await this.onboardingService.getSuggestions(user.id, qs)
      return response.ok({ artists })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }
      logger.error({ err: error }, 'Failed to fetch onboarding suggestions')
      return response.status(502).json({ message: 'Failed to fetch artist suggestions' })
    }
  }

  @ApiOperation({
    summary: 'Get artist suggestions based on Spotify top artists',
    description:
      'Fetches the user Spotify top artists, resolves each to a Deezer artist by name, and returns the deduplicated suggestions excluding already-selected artists.',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Spotify-based suggestions returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Spotify integration not connected' })
  @ApiResponse({ status: 502, description: 'Spotify upstream error' })
  async spotifySuggestions({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const result = await this.onboardingService.getSpotifySuggestions(user.id)

      if (isServiceError(result)) {
        return response.status(result.status).json({ message: result.error })
      }

      return response.ok({ artists: result })
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to fetch Spotify-based onboarding suggestions')
      return response.status(502).json({ message: 'Failed to fetch Spotify-based suggestions' })
    }
  }
}
