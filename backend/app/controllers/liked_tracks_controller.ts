import type { HttpContext } from '@adonisjs/core/http'
import { LikedTrackService } from '#services/liked_track_service'
import LikedTrack from '#models/liked_track'
import { inject } from '@adonisjs/core'

@inject()
export default class LikedTracksController {
  constructor(private likedTrackService: LikedTrackService) {}

  public async index({ response }: HttpContext) {
    try {
      const likedTracks = await this.likedTrackService.getAll()
      return response.json({ likedTracks })
    } catch (error) {
      return response.status(500).json({ message: 'Error while fetching liked tracks' })
    }
  }

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
