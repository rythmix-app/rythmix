import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ParkeurService, type ParkeurStartOptions } from '#services/parkeur_service'
import { parkeurStartValidator } from '#validators/parkeur_validator'
import { ApiBody, ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'

@inject()
export default class ParkeurController {
  constructor(private readonly parkeurService: ParkeurService) {}

  @ApiOperation({
    summary: 'Start a Parkeur game session',
    description:
      'Pre-loads 10 lyric rounds from a curated playlist or a Deezer artist top tracks (caching lyrics fetched from multiple sources) and creates the GameSession.',
  })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Parkeur start payload — exactly one of playlistId or artistId must be set',
    required: true,
    schema: {
      type: 'object',
      properties: {
        playlistId: { type: 'integer', example: 1 },
        artistId: { type: 'integer', example: 27 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Parkeur session created with rounds' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Game, playlist or artist not found' })
  @ApiResponse({ status: 409, description: 'An active Parkeur session already exists' })
  @ApiResponse({ status: 422, description: 'Not enough playable lyrics for this selection' })
  @ApiResponse({ status: 502, description: 'Failed to fetch source tracks' })
  public async start({ auth, request, response }: HttpContext) {
    const { playlistId, artistId } = await request.validateUsing(parkeurStartValidator)
    if ((playlistId && artistId) || (!playlistId && !artistId)) {
      return response.status(422).json({ message: 'Provide exactly one of playlistId or artistId' })
    }
    const userId = auth.user!.id
    const options: ParkeurStartOptions = playlistId
      ? { mode: 'playlist', playlistId }
      : { mode: 'artist', artistId: artistId! }

    try {
      const result = await this.parkeurService.startSession(userId, options)
      if ('error' in result) {
        return response.status(result.status).json({ message: result.error })
      }
      return response.status(201).json(result)
    } catch (error) {
      logger.error({ err: error }, 'Failed to start Parkeur session')
      return response.status(500).json({ message: 'Failed to start Parkeur session' })
    }
  }
}
