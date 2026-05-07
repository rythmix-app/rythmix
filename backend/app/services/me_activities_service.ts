import GameSession from '#models/game_session'
import UserTrackInteraction from '#models/user_track_interaction'
import { GameSessionStatus } from '#enums/game_session_status'
import { InteractionAction } from '#enums/interaction_action'

export type ActivityEvent =
  | {
      type: 'game_session'
      date: string
      gameTitle: string
      score: number
      maxScore: number
    }
  | {
      type: 'liked_track'
      date: string
      trackTitle: string | null
      artist: string | null
    }

export class MeActivitiesService {
  public async getRecentActivities(userId: string, limit: number): Promise<ActivityEvent[]> {
    const [sessions, likes] = await Promise.all([
      GameSession.query()
        .whereRaw('players::jsonb @> ?::jsonb', [JSON.stringify([{ userId }])])
        .where('status', GameSessionStatus.Completed)
        .preload('game')
        .orderBy('updated_at', 'desc')
        .limit(limit),
      UserTrackInteraction.query()
        .where('userId', userId)
        .where('action', InteractionAction.Liked)
        .orderBy('updated_at', 'desc')
        .limit(limit),
    ])

    const sessionEvents: ActivityEvent[] = sessions.map((session) => ({
      type: 'game_session',
      date: session.updatedAt.toISO()!,
      gameTitle: session.game?.name ?? '',
      score: Number(session.gameData?.score ?? 0),
      maxScore: Number(session.gameData?.maxScore ?? 0),
    }))

    const likeEvents: ActivityEvent[] = likes.map((like) => ({
      type: 'liked_track',
      date: like.updatedAt.toISO()!,
      trackTitle: like.title,
      artist: like.artist,
    }))

    return [...sessionEvents, ...likeEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  }
}

export default MeActivitiesService
