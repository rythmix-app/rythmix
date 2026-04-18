import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import { SpotifyService } from '#services/spotify_service'
import { spotifyRecentlyPlayedValidator, spotifyTopValidator } from '#validators/spotify_validator'

@inject()
export default class MeIntegrationsController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @ApiOperation({
    summary: 'Get Spotify integration status',
    description: 'Returns whether the current user has linked their Spotify account.',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Status returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async spotifyStatus({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const integration = await this.spotifyService.findByUserId(user.id)

    return response.ok({
      connected: !!integration,
      providerUserId: integration?.providerUserId ?? null,
      scopes: integration?.scopes ?? null,
    })
  }

  @ApiOperation({ summary: 'Get my Spotify top tracks' })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Top tracks returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Spotify integration not found' })
  async topTracks({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const qs = await request.validateUsing(spotifyTopValidator, { data: request.qs() })

    try {
      const data = await this.spotifyService.getTopTracks(user.id, qs)
      return response.ok(data)
    } catch (error) {
      return this.handleSpotifyError(error, response, { userId: user.id, path: 'top-tracks' })
    }
  }

  @ApiOperation({ summary: 'Get my Spotify top artists' })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Top artists returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Spotify integration not found' })
  async topArtists({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const qs = await request.validateUsing(spotifyTopValidator, { data: request.qs() })

    try {
      const data = await this.spotifyService.getTopArtists(user.id, qs)
      return response.ok(data)
    } catch (error) {
      return this.handleSpotifyError(error, response, { userId: user.id, path: 'top-artists' })
    }
  }

  @ApiOperation({ summary: 'Get my Spotify recently played tracks' })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Recently played returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Spotify integration not found' })
  async recentlyPlayed({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const qs = await request.validateUsing(spotifyRecentlyPlayedValidator, {
      data: request.qs(),
    })

    try {
      const data = await this.spotifyService.getRecentlyPlayed(user.id, qs)
      return response.ok(data)
    } catch (error) {
      return this.handleSpotifyError(error, response, {
        userId: user.id,
        path: 'recently-played',
      })
    }
  }

  @ApiOperation({ summary: 'Unlink Spotify integration' })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Integration removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No Spotify integration to unlink' })
  async unlinkSpotify({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const removed = await this.spotifyService.unlink(user.id)

    if (!removed) {
      return response.notFound({ message: 'No Spotify integration to unlink' })
    }

    return response.ok({ message: 'Spotify integration removed' })
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
      return response.unauthorized({ message: 'Spotify session expired, please reconnect' })
    }
    logger.error({ err: error, ...context }, 'Spotify data fetch failed')
    return response.internalServerError({
      message: 'Failed to fetch Spotify data',
    })
  }
}
