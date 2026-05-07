import { test } from '@japa/runner'
import Game from '#models/game'
import GameSession from '#models/game_session'
import UserTrackInteraction from '#models/user_track_interaction'
import { MeActivitiesService } from '#services/me_activities_service'
import { GameSessionStatus } from '#enums/game_session_status'
import { InteractionAction } from '#enums/interaction_action'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteGameSession } from '#tests/utils/game_session_helpers'
import { deleteTrackInteractions } from '#tests/utils/track_interaction_helpers'

async function createTestGame(tag: string) {
  return Game.create({
    name: `Game ${tag} ${Date.now()}`,
    description: `Desc ${tag}`,
    isEnabled: true,
    isMultiplayer: false,
  })
}

test.group('MeActivitiesService', (group) => {
  let service: MeActivitiesService

  deleteGameSession(group)
  deleteTrackInteractions(group)

  group.each.setup(() => {
    service = new MeActivitiesService()
  })

  test('returns empty array when user has no events', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('act_empty')
    const result = await service.getRecentActivities(user.id, 5)
    assert.deepEqual(result, [])
  })

  test('returns only completed game sessions for the user', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('act_sessions')
    const game = await createTestGame('blurchette')

    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'completed', score: 8, rank: 1 }],
      gameData: { score: 8, maxScore: 10 },
    })
    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Active,
      players: [{ userId: user.id, status: 'active', score: 0, rank: 1 }],
      gameData: { score: 0, maxScore: 10 },
    })

    const result = await service.getRecentActivities(user.id, 5)
    assert.equal(result.length, 1)
    assert.equal(result[0].type, 'game_session')
    if (result[0].type === 'game_session') {
      assert.equal(result[0].gameTitle, game.name)
      assert.equal(result[0].score, 8)
      assert.equal(result[0].maxScore, 10)
    }
  })

  test('returns only liked tracks (not disliked) for the user', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('act_likes')

    await UserTrackInteraction.create({
      userId: user.id,
      deezerTrackId: '1',
      action: InteractionAction.Liked,
      title: 'Papaoutai',
      artist: 'Stromae',
    })
    await UserTrackInteraction.create({
      userId: user.id,
      deezerTrackId: '2',
      action: InteractionAction.Disliked,
      title: 'Bad Song',
      artist: 'X',
    })

    const result = await service.getRecentActivities(user.id, 5)
    assert.equal(result.length, 1)
    assert.equal(result[0].type, 'liked_track')
    if (result[0].type === 'liked_track') {
      assert.equal(result[0].trackTitle, 'Papaoutai')
      assert.equal(result[0].artist, 'Stromae')
    }
  })

  test('merges sessions and likes, sorted by date desc and respects limit', async ({ assert }) => {
    const { user } = await createAuthenticatedUser('act_mix')
    const game = await createTestGame('mix')

    await UserTrackInteraction.create({
      userId: user.id,
      deezerTrackId: '10',
      action: InteractionAction.Liked,
      title: 'First',
      artist: 'A',
    })
    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'completed', score: 5, rank: 1 }],
      gameData: { score: 5, maxScore: 10 },
    })
    await UserTrackInteraction.create({
      userId: user.id,
      deezerTrackId: '11',
      action: InteractionAction.Liked,
      title: 'Last',
      artist: 'B',
    })

    const all = await service.getRecentActivities(user.id, 5)
    assert.equal(all.length, 3)
    const dates = all.map((e) => new Date(e.date).getTime())
    for (let i = 1; i < dates.length; i++) {
      assert.isAtMost(dates[i], dates[i - 1])
    }

    const limited = await service.getRecentActivities(user.id, 2)
    assert.equal(limited.length, 2)
  })

  test('does not include events from other users', async ({ assert }) => {
    const { user: userA } = await createAuthenticatedUser('act_userA')
    const { user: userB } = await createAuthenticatedUser('act_userB')
    const game = await createTestGame('isolation')

    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: userB.id, status: 'completed', score: 9, rank: 1 }],
      gameData: { score: 9, maxScore: 10 },
    })
    await UserTrackInteraction.create({
      userId: userB.id,
      deezerTrackId: 'x',
      action: InteractionAction.Liked,
      title: 'Foreign',
      artist: 'Foreign A',
    })

    const result = await service.getRecentActivities(userA.id, 5)
    assert.deepEqual(result, [])
  })
})
