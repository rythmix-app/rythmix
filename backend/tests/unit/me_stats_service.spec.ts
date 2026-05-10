import { test } from '@japa/runner'
import GameSession from '#models/game_session'
import UserTrackInteraction from '#models/user_track_interaction'
import Game from '#models/game'
import { MeStatsService } from '#services/me_stats_service'
import { GameSessionStatus } from '#enums/game_session_status'
import { InteractionAction } from '#enums/interaction_action'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteGameSession } from '#tests/utils/game_session_helpers'
import { deleteTrackInteractions } from '#tests/utils/track_interaction_helpers'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

test.group('MeStatsService', (group) => {
  let service: MeStatsService
  let game: Game

  deleteGameSession(group)
  deleteTrackInteractions(group)

  group.each.setup(async () => {
    service = new MeStatsService()
    game = await Game.create({
      name: 'Test Game for Stats',
      description: 'Test Description',
      isEnabled: true,
    })
  })

  test('getStats returns 0/0/0 for new user', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_new')
    const stats = await service.getStats(user.id)

    assert.deepEqual(stats, {
      totalSwipes: 0,
      gamesPlayed: 0,
      streak: 0,
    })
  })

  test('getStats aggregates swipes and games played', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_agg')

    // Create 2 swipes
    await UserTrackInteraction.create({
      userId: user.id,
      deezerTrackId: 'track_1',
      action: InteractionAction.Liked,
    })
    await UserTrackInteraction.create({
      userId: user.id,
      deezerTrackId: 'track_2',
      action: InteractionAction.Disliked,
    })

    // Create 1 completed game
    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })

    // Create 1 active game (should not count)
    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Active,
      players: [{ userId: user.id, status: 'playing', score: 0, rank: 1 }],
      gameData: {},
    })

    const stats = await service.getStats(user.id)
    assert.equal(stats.totalSwipes, 2)
    assert.equal(stats.gamesPlayed, 1)
  })

  test('getStreak calculates correct streak when ending today', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_streak_ok')
    const now = DateTime.now()

    // Today
    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })

    // Yesterday
    const yesterdaySession = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await db
      .from('game_sessions')
      .where('id', yesterdaySession.id)
      .update({ updated_at: now.minus({ days: 1 }).toSQL() })

    // 2 days ago
    const dayBeforeYesterdaySession = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await db
      .from('game_sessions')
      .where('id', dayBeforeYesterdaySession.id)
      .update({ updated_at: now.minus({ days: 2 }).toSQL() })

    const stats = await service.getStats(user.id)
    assert.equal(stats.streak, 3)
  })

  test('getStreak returns 0 if no game today', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_streak_fail')
    const now = DateTime.now()

    // Yesterday
    const yesterdaySession = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await db
      .from('game_sessions')
      .where('id', yesterdaySession.id)
      .update({ updated_at: now.minus({ days: 1 }).toSQL() })

    const stats = await service.getStats(user.id)
    assert.equal(stats.streak, 0)
  })

  test('getStreak handles multiple games on the same day', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_streak_multi')
    const now = DateTime.now()

    // 2 games today
    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 5, rank: 2 }],
      gameData: {},
    })

    // 1 game yesterday
    const yesterdaySession = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await db
      .from('game_sessions')
      .where('id', yesterdaySession.id)
      .update({ updated_at: now.minus({ days: 1 }).toSQL() })

    const stats = await service.getStats(user.id)
    assert.equal(stats.streak, 2)
  })

  test('getStreak breaks when a day is missing', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_streak_break')
    const now = DateTime.now()

    // Today
    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })

    // Day before yesterday (Yesterday is missing)
    const dayBeforeYesterdaySession = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await db
      .from('game_sessions')
      .where('id', dayBeforeYesterdaySession.id)
      .update({ updated_at: now.minus({ days: 2 }).toSQL() })

    const stats = await service.getStats(user.id)
    // Only today counts because yesterday is missing
    assert.equal(stats.streak, 1)
  })

  test('getStats works with a custom timezone', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_tz')
    const timezone = 'America/New_York'
    const todayInTz = DateTime.now().setZone(timezone)

    // Create game today in that timezone
    const session = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })

    // Ensure it's recorded as "today" in the target timezone
    await db.from('game_sessions').where('id', session.id).update({ updated_at: todayInTz.toSQL() })

    const stats = await service.getStats(user.id, timezone)
    assert.equal(stats.streak, 1)
  })

  test('getTotalSwipes and getGamesPlayed handle empty results', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_empty_safe')
    const stats = await service.getStats(user.id)
    assert.equal(stats.totalSwipes, 0)
    assert.equal(stats.gamesPlayed, 0)
    assert.equal(stats.streak, 0)
  })

  test('getStreak returns 0 if most recent game is not today', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_not_today')
    const now = DateTime.now()

    // Create a game for yesterday
    const session = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await db
      .from('game_sessions')
      .where('id', session.id)
      .update({ updated_at: now.minus({ days: 1 }).toSQL() })

    const stats = await service.getStats(user.id)
    assert.equal(stats.streak, 0)
  })

  test('getStreak returns 0 when multiple past games exist but none today', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_past_multi')
    const now = DateTime.now()

    // Yesterday
    const s1 = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await db
      .from('game_sessions')
      .where('id', s1.id)
      .update({ updated_at: now.minus({ days: 1 }).toSQL() })

    // Day before yesterday
    const s2 = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await db
      .from('game_sessions')
      .where('id', s2.id)
      .update({ updated_at: now.minus({ days: 2 }).toSQL() })

    const stats = await service.getStats(user.id)
    assert.equal(stats.streak, 0)
  })

  test('getStreak loop terminates when date does not match current day', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('stats_streak_break_loop')
    const now = DateTime.now()

    // Game today
    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })

    // Game 2 days ago (Gap of 1 day)
    const session = await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'playing', score: 10, rank: 1 }],
      gameData: {},
    })
    await db
      .from('game_sessions')
      .where('id', session.id)
      .update({ updated_at: now.minus({ days: 2 }).toSQL() })

    const stats = await service.getStats(user.id)
    assert.equal(stats.streak, 1)
  })
})
