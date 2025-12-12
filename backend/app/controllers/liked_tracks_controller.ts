import type { HttpContext } from '@adonisjs/core/http'
import { LikedTrackService } from '#services/liked_track_service'
import LikedTrack from '#models/liked_track'
import { inject } from '@adonisjs/core'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@foadonis/openapi/decorators'

@inject()
@ApiTags('Liked Tracks')
export default class LikedTracksController {
  constructor(private likedTrackService: LikedTrackService) {}

  @ApiOperation({ summary: 'List all liked tracks', description: 'Get a list of all liked tracks from users' })
  @ApiResponse({ status: 200, description: 'List of liked tracks retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Error while fetching liked tracks' })
  public async index({ response }: HttpContext) {
    try {
      const likedTracks = await this.likedTrackService.getAll()
      return response.json({ likedTracks })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching liked tracks' })
    }
  }

  @ApiOperation({ summary: 'Add a liked track', description: 'Add a track to user liked tracks collection (requires userId, spotifyId)' })
  @ApiBody({
    description: 'Liked track data',
    required: true,
    schema: {
      type: 'object',
      required: ['userId', 'spotifyId'],
      properties: {
        userId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
        spotifyId: { type: 'string', example: '3n3Ppam7vgaVa1iaRUc9Lp' },
        title: { type: 'string', example: 'Bohemian Rhapsody' },
        artist: { type: 'string', example: 'Queen' },
        type: { type: 'string', example: 'song' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Liked track added successfully' })
  @ApiResponse({ status: 500, description: 'Error while creating liked track' })
  public async create({ request, response }: HttpContext) {
    try {
      const payload = request.only(['userId', 'spotifyId', 'title', 'artist', 'type'])
      const result = await this.likedTrackService.createLikedTrack(payload)
      if (!(result instanceof LikedTrack)) {
        return response.status(result.status || 500).json({ message: result.error })
      }
      return response.status(201).json({ likedTrack: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while creating liked track' })
    }
  }

  @ApiOperation({ summary: 'Get liked track by ID', description: 'Retrieve a specific liked track by its ID' })
  @ApiParam({ name: 'id', description: 'Liked track ID', required: true })
  @ApiResponse({ status: 200, description: 'Liked track found' })
  @ApiResponse({ status: 404, description: 'Liked track not found' })
  @ApiResponse({ status: 500, description: 'Error while fetching liked track' })
  public async show({ params, response }: HttpContext) {
    try {
      const likedTrack = await this.likedTrackService.getById(params.id)
      if (!likedTrack) {
        return response.status(404).json({ message: 'Liked track not found' })
      }
      return response.json({ likedTrack })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching liked track' })
    }
  }

  @ApiOperation({ summary: 'Update liked track', description: 'Update liked track information (title, artist, type, etc.)' })
  @ApiParam({ name: 'id', description: 'Liked track ID', required: true })
  @ApiBody({
    description: 'Liked track data to update',
    required: true,
    schema: {
      type: 'object',
      properties: {
        spotifyId: { type: 'string', example: '3n3Ppam7vgaVa1iaRUc9Lp' },
        title: { type: 'string', example: 'Bohemian Rhapsody' },
        artist: { type: 'string', example: 'Queen' },
        type: { type: 'string', example: 'song' },
        userId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Liked track updated successfully' })
  @ApiResponse({ status: 404, description: 'Liked track not found' })
  @ApiResponse({ status: 500, description: 'Error while updating liked track' })
  public async update({ params, request, response }: HttpContext) {
    try {
      const result = await this.likedTrackService.updateLikedTrack(
        params.id,
        request.only(['spotifyId', 'title', 'artist', 'type', 'userId'])
      )
      if (!(result instanceof LikedTrack)) {
        return response.status(result.status || 500).json({ message: result.error })
      }
      return response.json({ likedTrack: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while updating liked track' })
    }
  }

  @ApiOperation({ summary: 'Delete liked track', description: 'Remove a track from liked tracks collection' })
  @ApiParam({ name: 'id', description: 'Liked track ID', required: true })
  @ApiResponse({ status: 200, description: 'Liked track deleted successfully' })
  @ApiResponse({ status: 404, description: 'Liked track not found' })
  @ApiResponse({ status: 500, description: 'Error while deleting liked track' })
  public async delete({ params, response }: HttpContext) {
    try {
      const result = await this.likedTrackService.deleteLikedTrack(params.id)

      if ((result as any).error) {
        return response
          .status((result as any).status || 500)
          .json({ message: (result as any).error })
      }

      return response.json({ message: (result as any).message })
    } catch (error) {
      return response.status(500).json({ message: 'Error while deleting liked track' })
    }
  }
}
