import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  CuratedPlaylistService,
  DeezerPlaylistFetchError,
  PlaylistNotFoundError,
} from '#services/curated_playlist_service'
import { curatedPlaylistTracksValidator } from '#validators/curated_playlist_validator'
import { ApiOperation, ApiParam, ApiResponse } from '@foadonis/openapi/decorators'

@inject()
export default class CuratedPlaylistsController {
  constructor(private readonly curatedPlaylistService: CuratedPlaylistService) {}

  @ApiOperation({
    summary: 'List Blindtest curated playlists',
    description: 'Returns the curated playlists displayed in the Blindtest game.',
  })
  @ApiResponse({ status: 200, description: 'Playlists retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Failed to fetch curated playlists' })
  public async index({ response }: HttpContext) {
    try {
      const playlists = await this.curatedPlaylistService.listPlaylists()
      return response.ok({ playlists })
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch curated playlists')
      return response.internalServerError({ message: 'Failed to fetch curated playlists' })
    }
  }

  @ApiOperation({
    summary: 'Get a random sample of tracks for a curated playlist',
    description:
      'Fetches the curated playlist tracks from Deezer, shuffles them, and returns up to `count` items.',
  })
  @ApiParam({ name: 'id', description: 'Curated playlist ID', required: true })
  @ApiResponse({ status: 200, description: 'Tracks retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Curated playlist not found' })
  @ApiResponse({ status: 502, description: 'Failed to fetch tracks from Deezer' })
  public async tracks({ params, request, response }: HttpContext) {
    try {
      const { count } = await request.validateUsing(curatedPlaylistTracksValidator, {
        data: request.qs(),
      })
      const playlistId = Number(params.id)
      if (!Number.isFinite(playlistId)) {
        return response.badRequest({ message: 'Invalid playlist id' })
      }

      const tracks = await this.curatedPlaylistService.getRandomTracks(playlistId, count)
      return response.ok({ tracks })
    } catch (error) {
      if (error instanceof PlaylistNotFoundError) {
        return response.notFound({ message: 'Curated playlist not found' })
      }
      if (error instanceof DeezerPlaylistFetchError) {
        logger.error({ err: error }, 'Deezer playlist fetch failed')
        return response.status(502).json({ message: 'Failed to fetch tracks from Deezer' })
      }
      throw error
    }
  }
}
