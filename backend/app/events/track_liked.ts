import { BaseEvent } from '@adonisjs/core/events'

export type TrackLikedPayload = {
  userId: string
  deezerTrackId: string
  deezerArtistId: string | null
}

export default class TrackLiked extends BaseEvent {
  constructor(public payload: TrackLikedPayload) {
    super()
  }
}
