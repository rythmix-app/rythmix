import type { HttpContext } from '@adonisjs/core/http'
import { LickedTrackService } from '#services/licked_track_service'
import LickedTrack from '#models/licked_track'
import { inject } from '@adonisjs/core'

@inject()
export default class LickedTracksController {
  constructor(private lickedTrackService: LickedTrackService) {}

  public async index({ response }: HttpContext) {
    try {
      const lickedTracks = await this.lickedTrackService.getAll()
      return response.json({ lickedTracks })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching licked tracks' })
    }
  }

  public async create({ request, response }: HttpContext) {
    try {
      const payload = request.only(['userId', 'spotifyId', 'title', 'artist', 'type'])
      const result = await this.lickedTrackService.createLickedTrack(payload)
      if (!(result instanceof LickedTrack)) {
        return response.status(result.status || 500).json({ message: result.error })
      }
      return response.status(201).json({ lickedTrack: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while creating licked track' })
    }
  }

  public async show({ params, response }: HttpContext) {
    try {
      const lickedTrack = await this.lickedTrackService.getById(params.id)
      if (!lickedTrack) {
        return response.status(404).json({ message: 'Licked track not found' })
      }
      return response.json({ lickedTrack })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching licked track' })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    try {
      const result = await this.lickedTrackService.updateLickedTrack(
        params.id,
        request.only(['spotifyId', 'title', 'artist', 'type', 'userId'])
      )
      if (!(result instanceof LickedTrack)) {
        return response.status(result.status || 500).json({ message: result.error })
      }
      return response.json({ lickedTrack: result })
    } catch (error) {
      return response.status(500).json({ message: 'Error while updating licked track' })
    }
  }

  public async delete({ params, response }: HttpContext) {
    try {
      const result = await this.lickedTrackService.deleteLickedTrack(params.id)

      if ((result as any).error) {
        return response
          .status((result as any).status || 500)
          .json({ message: (result as any).error })
      }

      return response.json({ message: (result as any).message })
    } catch (error) {
      return response.status(500).json({ message: 'Error while deleting licked track' })
    }
  }
}
