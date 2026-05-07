import UserTrackInteraction from '#models/user_track_interaction'
import GameSession from '#models/game_session'
import { GameSessionStatus } from '#enums/game_session_status'
import { DateTime } from 'luxon'

export class MeStatsService {
  /**
   * Get aggregated stats for the authenticated user
   */
  public async getStats(userId: string, timezone: string = 'UTC') {
    console.log('[MeStatsService] Getting stats for:', userId)
    const totalSwipes = await this.getTotalSwipes(userId)
    console.log('[MeStatsService] totalSwipes:', totalSwipes)
    const gamesPlayed = await this.getGamesPlayed(userId)
    console.log('[MeStatsService] gamesPlayed:', gamesPlayed)
    const streak = await this.getStreak(userId, timezone)
    console.log('[MeStatsService] streak:', streak)

    return {
      totalSwipes,
      gamesPlayed,
      streak,
    }
  }

  /**
   * Count all track interactions (likes and dislikes)
   */
  private async getTotalSwipes(userId: string) {
    const result = await UserTrackInteraction.query().where('userId', userId).count('* as total')
    return Number(result[0].$extras.total)
  }

  /**
   * Count all completed game sessions
   */
  private async getGamesPlayed(userId: string) {
    const result = await GameSession.query()
      .whereRaw('players::jsonb @> ?::jsonb', [JSON.stringify([{ userId }])])
      .where('status', GameSessionStatus.Completed)
      .count('* as total')
    return Number(result[0].$extras.total)
  }

  /**
   * Calculate consecutive days streak ending today
   */
  private async getStreak(userId: string, timezone: string = 'UTC') {
    // Get unique dates of completed games
    // We use updatedAt as finished_at is not currently in the schema
    const sessions = await GameSession.query()
      .whereRaw('players::jsonb @> ?::jsonb', [JSON.stringify([{ userId }])])
      .where('status', GameSessionStatus.Completed)
      .select('updated_at')
      .orderBy('updated_at', 'desc')

    if (sessions.length === 0) {
      return 0
    }

    const uniqueDates = new Set<string>()
    for (const session of sessions) {
      uniqueDates.add(session.updatedAt.setZone(timezone).toISODate()!)
    }

    const sortedDates = Array.from(uniqueDates).sort().reverse()
    const today = DateTime.now().setZone(timezone).toISODate()!

    // If the most recent game was not today, streak is 0 (as per ticket requirements)
    if (sortedDates[0] !== today) {
      return 0
    }

    let streak = 0
    let currentDay = DateTime.fromISO(today).setZone(timezone)

    for (const dateStr of sortedDates) {
      if (dateStr === currentDay.toISODate()) {
        streak++
        currentDay = currentDay.minus({ days: 1 })
      } else {
        break
      }
    }

    return streak
  }
}

export default MeStatsService
