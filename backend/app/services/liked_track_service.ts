// TypeScript
import LikedTrack from '#models/liked_track'

export class LikedTrackService {
  public async getAll() {
    // return all liked tracks
    return LikedTrack.query()
  }

  public async getById(likedTrackId: number | string) {
    return LikedTrack.query().where('id', likedTrackId).first()
  }

  public async createLikedTrack(payload: {
    userId: string
    spotifyId?: string
    title?: string | null
    artist?: string | null
    type?: string | null
  }) {
    try {
      return await LikedTrack.create(payload)
    } catch (error: any) {
      // Handle unique / truncation DB errors similarly to other services
      if (error.code === '23505') {
        return {
          error: 'Conflict when creating liked track',
          status: 409,
        }
      }
      if (error.code === '22001') {
        return {
          error: 'One or more fields exceed maximum length',
          status: 400,
        }
      }
      throw error
    }
  }

  public async updateLikedTrack(likedTrackId: number | string, payload: Partial<LikedTrack>) {
    const likedTrack = await LikedTrack.query().where('id', likedTrackId).first()
    if (!likedTrack) {
      return {
        error: 'LikedTrack not found',
        status: 404,
      }
    }

    likedTrack.merge(payload)
    try {
      await likedTrack.save()
      return likedTrack
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          error: 'Conflict when updating liked track',
          status: 409,
        }
      }
      if (error.code === '22001') {
        return {
          error: 'One or more fields exceed maximum length',
          status: 400,
        }
      }
      throw error
    }
  }

  public async deleteLikedTrack(likedTrackId: number | string) {
    const likedTrack = await LikedTrack.query().where('id', likedTrackId).first()
    if (!likedTrack) {
      return {
        error: 'LikedTrack not found',
        status: 404,
      }
    }
    await likedTrack.delete()
    return { message: `LikedTrack with ID: ${likedTrackId} deleted successfully` }
  }
}

export default LikedTrackService
