import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import User from '#models/user'
import { SpotifyService } from '#services/spotify_service'
import { spotifyRecentlyPlayedValidator, spotifyTopValidator } from '#validators/spotify_validator'

@inject()
export default class AdminUserIntegrationsController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @ApiOperation({
    summary: "Get a user's Spotify integration status (admin)",
    description:
      "Returns metadata about the targeted user's Spotify link without leaking access or refresh tokens.",
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'User ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'Status returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async spotifyStatus({ params, response }: HttpContext) {
    const userId = params.id
    const userExists = await User.query().where('id', userId).whereNull('deleted_at').first()
    if (!userExists) {
      return response.notFound({ message: 'User not found' })
    }

    const integration = await this.spotifyService.findByUserId(userId)
    return response.ok({
      connected: !!integration,
      providerUserId: integration?.providerUserId ?? null,
      scopes: integration?.scopes ?? null,
      likedPlaylistId: integration?.spotifyLikedPlaylistId ?? null,
      linkedAt: integration?.createdAt ?? null,
      updatedAt: integration?.updatedAt ?? null,
      expiresAt: integration?.expiresAt ?? null,
    })
  }

  @ApiOperation({ summary: "Get a user's Spotify top tracks (admin)" })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'User ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'Top tracks returned' })
  @ApiResponse({ status: 404, description: 'Spotify integration not found' })
  async topTracks({ params, request, response }: HttpContext) {
    const userId = params.id
    const qs = await request.validateUsing(spotifyTopValidator, { data: request.qs() })

    try {
      const data = await this.spotifyService.getTopTracks(userId, qs)
      return response.ok(data)
    } catch (error) {
      return this.handleSpotifyError(error, response, { userId, path: 'top-tracks' })
    }
  }

  @ApiOperation({ summary: "Get a user's Spotify top artists (admin)" })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'User ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'Top artists returned' })
  @ApiResponse({ status: 404, description: 'Spotify integration not found' })
  async topArtists({ params, request, response }: HttpContext) {
    const userId = params.id
    const qs = await request.validateUsing(spotifyTopValidator, { data: request.qs() })

    try {
      const data = await this.spotifyService.getTopArtists(userId, qs)
      return response.ok(data)
    } catch (error) {
      return this.handleSpotifyError(error, response, { userId, path: 'top-artists' })
    }
  }

  @ApiOperation({ summary: "Get a user's Spotify recently played tracks (admin)" })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'User ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'Recently played returned' })
  @ApiResponse({ status: 404, description: 'Spotify integration not found' })
  async recentlyPlayed({ params, request, response }: HttpContext) {
    const userId = params.id
    const qs = await request.validateUsing(spotifyRecentlyPlayedValidator, {
      data: request.qs(),
    })

    try {
      const data = await this.spotifyService.getRecentlyPlayed(userId, qs)
      return response.ok(data)
    } catch (error) {
      return this.handleSpotifyError(error, response, { userId, path: 'recently-played' })
    }
  }

  private handleSpotifyError(
    error: unknown,
    response: HttpContext['response'],
    context: { userId: string; path: string }
  ) {
    if (error instanceof Error && error.message === 'Spotify integration not found') {
      return response.notFound({ message: error.message })
    }
    if (error instanceof Error && error.message === 'Spotify refresh token missing') {
      return response.unauthorized({
        message: 'Spotify session expired, the user must reconnect',
      })
    }
    logger.error({ err: error, ...context }, 'Admin Spotify data fetch failed')
    return response.internalServerError({ message: 'Failed to fetch Spotify data' })
  }
}
