import UserTrackInteraction from '#models/user_track_interaction'
import { InteractionAction } from '#enums/interaction_action'
import { type ServiceError } from '#types/service_error'
import TrackLiked from '#events/track_liked'

export class TrackInteractionsService {
  public getByUserId(userId: string, action?: InteractionAction) {
    const query = UserTrackInteraction.query().where('userId', userId)
    if (action) {
      query.where('action', action)
    }
    return query
  }

  public async upsertInteraction(payload: {
    userId: string
    deezerTrackId: string
    deezerArtistId?: string | null
    action: InteractionAction
    title?: string | null
    artist?: string | null
    isrc?: string | null
  }): Promise<UserTrackInteraction | ServiceError> {
    try {
      const existing = await UserTrackInteraction.query()
        .where('userId', payload.userId)
        .where('deezerTrackId', payload.deezerTrackId)
        .first()

      const wasAlreadyLiked = existing?.action === InteractionAction.Liked

      const interaction = await UserTrackInteraction.updateOrCreate(
        {
          userId: payload.userId,
          deezerTrackId: payload.deezerTrackId,
        },
        {
          action: payload.action,
          deezerArtistId: payload.deezerArtistId ?? null,
          title: payload.title ?? null,
          artist: payload.artist ?? null,
          isrc: payload.isrc ?? null,
        }
      )

      if (payload.action === InteractionAction.Liked && !wasAlreadyLiked) {
        await TrackLiked.dispatch({
          userId: payload.userId,
          deezerTrackId: payload.deezerTrackId,
          deezerArtistId: payload.deezerArtistId ?? null,
        })
      }

      return interaction
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

  public async deleteInteraction(
    userId: string,
    deezerTrackId: string
  ): Promise<{ message: string } | ServiceError> {
    const deletedCount = await UserTrackInteraction.query()
      .where('userId', userId)
      .where('deezerTrackId', deezerTrackId)
      .delete()

    const affected = Array.isArray(deletedCount)
      ? Number(deletedCount[0] ?? 0)
      : Number(deletedCount)
    if (!affected) {
      return {
        error: 'Track interaction not found',
        status: 404,
      }
    }

    return { message: `Interaction for track ${deezerTrackId} deleted successfully` }
  }
}

export default TrackInteractionsService
