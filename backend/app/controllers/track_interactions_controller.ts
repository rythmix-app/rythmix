import type { HttpContext } from '@adonisjs/core/http'
import { TrackInteractionsService } from '#services/track_interactions_service'
import {
  SpotifyAddTrackResult,
  SpotifyPlaylistService,
  SpotifyRemoveTrackResult,
  SpotifyScopeUpgradeRequiredError,
} from '#services/spotify_playlist_service'
import { SpotifyService } from '#services/spotify_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
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
import { InteractionAction } from '#enums/interaction_action'

interface SpotifyTriggerSnapshot {
  triggered: boolean
  added?: boolean
  removed?: boolean
  notOnSpotify?: boolean
  scopeUpgradeRequired?: boolean
}

@inject()
export default class TrackInteractionsController {
  constructor(
    private readonly trackInteractionsService: TrackInteractionsService,
    private readonly spotifyService: SpotifyService,
    private readonly spotifyPlaylistService: SpotifyPlaylistService
  ) {}

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

      const spotifyResult = await this.syncToSpotifyPlaylist(
        user.id,
        payload.deezerTrackId,
        payload.action
      )

      return response.status(200).json({ interaction: result, spotifyResult })
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

  private async syncToSpotifyPlaylist(
    userId: string,
    deezerTrackId: string,
    action: InteractionAction
  ): Promise<SpotifyTriggerSnapshot | undefined> {
    const integration = await this.spotifyService.findByUserId(userId)
    if (!integration) return undefined

    try {
      if (action === InteractionAction.Liked) {
        const r: SpotifyAddTrackResult = await this.spotifyPlaylistService.addTrack(
          userId,
          deezerTrackId
        )
        return { triggered: true, added: r.added, notOnSpotify: r.notOnSpotify }
      }
      const r: SpotifyRemoveTrackResult = await this.spotifyPlaylistService.removeTrack(
        userId,
        deezerTrackId
      )
      return { triggered: true, removed: r.removed }
    } catch (error) {
      if (error instanceof SpotifyScopeUpgradeRequiredError) {
        return { triggered: false, scopeUpgradeRequired: true }
      }
      logger.error(
        { err: error, userId, deezerTrackId, action },
        'Spotify playlist sync from track interaction failed'
      )
      return { triggered: false }
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

      const spotifyResult = await this.syncToSpotifyPlaylist(
        user.id,
        deezerTrackId,
        InteractionAction.Disliked
      )

      return response.json({ message: result.message, spotifyResult })
    } catch {
      return response.status(500).json({ message: 'Error while deleting track interaction' })
    }
  }
}
