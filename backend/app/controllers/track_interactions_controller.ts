import type { HttpContext } from '@adonisjs/core/http'
import { TrackInteractionsService } from '#services/track_interactions_service'
import { inject } from '@adonisjs/core'
import { isServiceError } from '#types/service_error'
import {
  createTrackInteractionValidator,
  listTrackInteractionsValidator,
} from '#validators/track_interaction_validator'
import { errors } from '@vinejs/vine'
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiSecurity,
} from '@foadonis/openapi/decorators'

@inject()
export default class TrackInteractionsController {
  constructor(private readonly trackInteractionsService: TrackInteractionsService) {}

  @ApiOperation({
    summary: 'List current user track interactions',
    description: 'Retrieve all track interactions (liked/disliked) for the authenticated user',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Interactions retrieved successfully' })
  @ApiResponse({ status: 422, description: 'Invalid query parameters' })
  @ApiResponse({ status: 500, description: 'Error while fetching track interactions' })
  public async index({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { action } = await request.validateUsing(listTrackInteractionsValidator, {
        data: request.qs(),
      })

      const interactions = await this.trackInteractionsService.getByUserId(user.id, action)
      return response.json({ interactions })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }
      return response.status(500).json({ message: 'Error while fetching track interactions' })
    }
  }

  @ApiOperation({
    summary: 'Upsert a track interaction',
    description:
      'Create or update a track interaction (liked/disliked) for the authenticated user. Upsert on (user, deezerTrackId).',
  })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Track interaction data',
    required: true,
    schema: {
      type: 'object',
      required: ['deezerTrackId', 'action'],
      properties: {
        deezerTrackId: { type: 'string', example: '3135556' },
        deezerArtistId: { type: 'string', example: '27' },
        action: { type: 'string', enum: ['liked', 'disliked'], example: 'liked' },
        title: { type: 'string', example: 'Blinding Lights' },
        artist: { type: 'string', example: 'The Weeknd' },
        isrc: { type: 'string', example: 'USUG11904206' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Interaction upserted successfully' })
  @ApiResponse({ status: 422, description: 'Invalid payload' })
  @ApiResponse({ status: 500, description: 'Error while upserting track interaction' })
  public async upsert({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const payload = await request.validateUsing(createTrackInteractionValidator)

      const result = await this.trackInteractionsService.upsertInteraction({
        userId: user.id,
        ...payload,
      })

      if (isServiceError(result)) {
        return response.status(result.status).json({ message: result.error })
      }

      return response.status(200).json({ interaction: result })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }
      return response.status(500).json({ message: 'Error while upserting track interaction' })
    }
  }

  @ApiOperation({
    summary: 'Delete a track interaction',
    description: 'Remove a track interaction for the authenticated user by Deezer track ID',
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'deezerTrackId', description: 'Deezer track ID', required: true })
  @ApiResponse({ status: 200, description: 'Interaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Interaction not found' })
  @ApiResponse({ status: 500, description: 'Error while deleting track interaction' })
  public async delete({ auth, params, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { deezerTrackId } = params

      const result = await this.trackInteractionsService.deleteInteraction(user.id, deezerTrackId)

      if (isServiceError(result)) {
        return response.status(result.status).json({ message: result.error })
      }

      return response.json({ message: result.message })
    } catch {
      return response.status(500).json({ message: 'Error while deleting track interaction' })
    }
  }
}
