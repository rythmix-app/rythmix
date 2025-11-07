// TypeScript
import LickedTrack from '#models/licked_track'

export class LickedTrackService {
  public async getAll() {
    // return all licked tracks
    return LickedTrack.query()
  }

  public async getById(lickedTrackId: number | string) {
    return LickedTrack.query().where('id', lickedTrackId).first()
  }

  public async createLickedTrack(payload: {
    userId: string
    spotifyId?: string
    title?: string | null
    artist?: string | null
    type?: string | null
  }) {
    try {
      const lickedTrack = await LickedTrack.create(payload)
      return lickedTrack
    } catch (error: any) {
      // Handle unique / truncation DB errors similarly to other services
      if (error.code === '23505') {
        return {
          error: 'Conflict when creating licked track',
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

  public async updateLickedTrack(lickedTrackId: number | string, payload: Partial<LickedTrack>) {
    const lickedTrack = await LickedTrack.query().where('id', lickedTrackId).first()
    if (!lickedTrack) {
      return {
        error: 'LickedTrack not found',
        status: 404,
      }
    }

    lickedTrack.merge(payload)
    try {
      await lickedTrack.save()
      return lickedTrack
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          error: 'Conflict when updating licked track',
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

  public async deleteLickedTrack(lickedTrackId: number | string) {
    const lickedTrack = await LickedTrack.query().where('id', lickedTrackId).first()
    if (!lickedTrack) {
      return {
        error: 'LickedTrack not found',
        status: 404,
      }
    }
    await lickedTrack.delete()
    return { message: `LickedTrack with ID: ${lickedTrackId} deleted successfully` }
  }
}

export default LickedTrackService
