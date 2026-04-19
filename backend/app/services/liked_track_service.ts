// TypeScript
import LikedTrack from '#models/liked_track'
import { type ServiceError } from '#types/service_error'

export class LikedTrackService {
  public async getAll() {
    // return all liked tracks
    return LikedTrack.query()
  }

  public async getById(likedTrackId: number | string) {
    return LikedTrack.query().where('id', likedTrackId).first()
  }

  public async getByUserId(userId: string) {
    return LikedTrack.query().where('userId', userId)
  }

  public async createLikedTrack(payload: {
    userId: string
    deezerTrackId?: string
    title?: string | null
    artist?: string | null
    type?: string | null
  }): Promise<LikedTrack | ServiceError> {
    try {
      return await LikedTrack.firstOrCreate(
        { userId: payload.userId, deezerTrackId: payload.deezerTrackId },
        { title: payload.title, artist: payload.artist, type: payload.type }
      )
    } catch (error: any) {
      if (error.code === '22001') {
        return {
          error: 'One or more fields exceed maximum length',
          status: 400,
        }
      }
      throw error
    }
  }

  public async updateLikedTrack(
    likedTrackId: number | string,
    payload: Partial<LikedTrack>
  ): Promise<LikedTrack | ServiceError> {
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

  public async deleteLikedTrack(
    likedTrackId: number | string
  ): Promise<{ message: string } | ServiceError> {
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

  public async deleteMyLikedTrack(
    userId: string,
    deezerTrackId: string
  ): Promise<{ message: string } | ServiceError> {
    const likedTrack = await LikedTrack.query()
      .where('userId', userId)
      .where('deezerTrackId', deezerTrackId)
      .first()

    if (!likedTrack) {
      return {
        error: 'LikedTrack not found',
        status: 404,
      }
    }

    await likedTrack.delete()
    return { message: `LikedTrack with deezerTrackId: ${deezerTrackId} deleted successfully` }
  }
}

export default LikedTrackService
