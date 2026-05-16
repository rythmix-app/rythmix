import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  CuratedPlaylistService,
  DeezerPlaylistFetchError,
  DeezerPlaylistNotFoundError,
  DuplicateDeezerPlaylistError,
  InvalidDeezerUrlError,
  PlaylistNotFoundError,
} from '#services/curated_playlist_service'
import {
  createCuratedPlaylistValidator,
  curatedPlaylistTracksValidator,
  updateCuratedPlaylistValidator,
} from '#validators/curated_playlist_validator'
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
} from '@foadonis/openapi/decorators'

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

  @ApiOperation({
    summary: 'List every track of a curated playlist (admin only)',
    description:
      'Fetches every track from Deezer in catalogue order (deduped, not shuffled). Used by the back-office to preview a playlist.',
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Curated playlist ID', required: true })
  @ApiResponse({ status: 200, description: 'Tracks retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Curated playlist not found' })
  @ApiResponse({ status: 502, description: 'Failed to fetch tracks from Deezer' })
  public async allTracks({ params, response }: HttpContext) {
    const playlistId = Number(params.id)
    if (!Number.isFinite(playlistId)) {
      return response.badRequest({ message: 'Invalid playlist id' })
    }
    try {
      const tracks = await this.curatedPlaylistService.listAllTracks(playlistId)
      return response.ok({ tracks })
    } catch (error) {
      if (error instanceof PlaylistNotFoundError) {
        return response.notFound({ message: 'Curated playlist not found' })
      }
      if (error instanceof DeezerPlaylistFetchError) {
        logger.error({ err: error }, 'Deezer playlist fetch failed (all tracks)')
        return response.status(502).json({ message: 'Failed to fetch tracks from Deezer' })
      }
      throw error
    }
  }

  @ApiOperation({
    summary: 'Import a curated playlist from a Deezer URL (admin only)',
    description:
      'Parses the Deezer URL, resolves short links, fetches playlist metadata, and creates a new curated playlist entry.',
  })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Deezer playlist URL + genre label',
    required: true,
    schema: {
      type: 'object',
      required: ['url', 'genreLabel'],
      properties: {
        url: { type: 'string', example: 'https://www.deezer.com/fr/playlist/15223693943' },
        genreLabel: { type: 'string', example: 'Rap FR' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Curated playlist created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid Deezer URL' })
  @ApiResponse({ status: 404, description: 'Deezer playlist not found' })
  @ApiResponse({ status: 409, description: 'Playlist already in catalogue' })
  @ApiResponse({ status: 502, description: 'Deezer is unavailable' })
  public async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createCuratedPlaylistValidator)
    try {
      const playlist = await this.curatedPlaylistService.createFromDeezerUrl(payload)
      return response.created({ playlist })
    } catch (error) {
      if (error instanceof InvalidDeezerUrlError) {
        return response.badRequest({ message: 'Invalid Deezer playlist URL' })
      }
      if (error instanceof DuplicateDeezerPlaylistError) {
        return response.conflict({ message: 'This Deezer playlist is already in the catalogue' })
      }
      if (error instanceof DeezerPlaylistNotFoundError) {
        return response.notFound({ message: 'Deezer playlist not found' })
      }
      if (error instanceof DeezerPlaylistFetchError) {
        logger.error({ err: error }, 'Deezer playlist fetch failed during import')
        return response.status(502).json({ message: 'Failed to fetch Deezer playlist' })
      }
      throw error
    }
  }

  @ApiOperation({
    summary: 'Rename a curated playlist (admin only)',
    description:
      'Updates the local name only and flips the nameOverridden flag so refresh keeps the override.',
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Curated playlist ID', required: true })
  @ApiBody({
    description: 'New display name',
    required: true,
    schema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string', example: 'Rap FR Essentials' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Curated playlist updated successfully' })
  @ApiResponse({ status: 404, description: 'Curated playlist not found' })
  public async update({ params, request, response }: HttpContext) {
    const playlistId = Number(params.id)
    if (!Number.isFinite(playlistId)) {
      return response.badRequest({ message: 'Invalid playlist id' })
    }
    const payload = await request.validateUsing(updateCuratedPlaylistValidator)
    try {
      const playlist = await this.curatedPlaylistService.renamePlaylist(playlistId, payload.name)
      return response.ok({ playlist })
    } catch (error) {
      if (error instanceof PlaylistNotFoundError) {
        return response.notFound({ message: 'Curated playlist not found' })
      }
      throw error
    }
  }

  @ApiOperation({
    summary: 'Refresh curated playlist metadata from Deezer (admin only)',
    description:
      'Refetches cover, track count, and name (unless overridden) from Deezer. Invalidates the in-memory track cache.',
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Curated playlist ID', required: true })
  @ApiResponse({ status: 200, description: 'Curated playlist refreshed successfully' })
  @ApiResponse({ status: 404, description: 'Curated playlist not found' })
  @ApiResponse({ status: 502, description: 'Deezer is unavailable' })
  public async refresh({ params, response }: HttpContext) {
    const playlistId = Number(params.id)
    if (!Number.isFinite(playlistId)) {
      return response.badRequest({ message: 'Invalid playlist id' })
    }
    try {
      const playlist = await this.curatedPlaylistService.refreshPlaylist(playlistId)
      return response.ok({ playlist })
    } catch (error) {
      if (error instanceof PlaylistNotFoundError) {
        return response.notFound({ message: 'Curated playlist not found' })
      }
      if (error instanceof DeezerPlaylistNotFoundError) {
        return response.notFound({ message: 'Deezer playlist not found' })
      }
      if (error instanceof DeezerPlaylistFetchError) {
        logger.error({ err: error }, 'Deezer playlist fetch failed during refresh')
        return response.status(502).json({ message: 'Failed to fetch Deezer playlist' })
      }
      throw error
    }
  }

  @ApiOperation({
    summary: 'Delete a curated playlist (admin only)',
    description: 'Hard deletes the playlist and invalidates the in-memory track cache.',
  })
  @ApiSecurity('bearerAuth')
  @ApiParam({ name: 'id', description: 'Curated playlist ID', required: true })
  @ApiResponse({ status: 204, description: 'Curated playlist deleted successfully' })
  @ApiResponse({ status: 404, description: 'Curated playlist not found' })
  public async destroy({ params, response }: HttpContext) {
    const playlistId = Number(params.id)
    if (!Number.isFinite(playlistId)) {
      return response.badRequest({ message: 'Invalid playlist id' })
    }
    try {
      await this.curatedPlaylistService.deletePlaylist(playlistId)
      return response.noContent()
    } catch (error) {
      if (error instanceof PlaylistNotFoundError) {
        return response.notFound({ message: 'Curated playlist not found' })
      }
      throw error
    }
  }
}
