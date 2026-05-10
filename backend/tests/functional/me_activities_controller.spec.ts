import { test } from '@japa/runner'
import Game from '#models/game'
import GameSession from '#models/game_session'
import UserTrackInteraction from '#models/user_track_interaction'
import { GameSessionStatus } from '#enums/game_session_status'
import { InteractionAction } from '#enums/interaction_action'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteGameSession } from '#tests/utils/game_session_helpers'
import { deleteTrackInteractions } from '#tests/utils/track_interaction_helpers'

test.group('MeActivitiesController - auth guard', (group) => {
  deleteGameSession(group)
  deleteTrackInteractions(group)

  test('GET /api/me/activities requires auth', async ({ client }) => {
    const response = await client.get('/api/me/activities')
    response.assertStatus(401)
  })
})

test.group('MeActivitiesController - index', (group) => {
  deleteGameSession(group)
  deleteTrackInteractions(group)

  test('returns aggregated activities for the authenticated user', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('act_idx')
    const game = await Game.create({
      name: 'Blurchette Test',
      description: 'd',
      isEnabled: true,
      isMultiplayer: false,
    })

    await GameSession.create({
      gameId: game.id,
      status: GameSessionStatus.Completed,
      players: [{ userId: user.id, status: 'completed', score: 8, rank: 1 }],
      gameData: { score: 8, maxScore: 10 },
    })
    await UserTrackInteraction.create({
      userId: user.id,
      deezerTrackId: '42',
      action: InteractionAction.Liked,
      title: 'Papaoutai',
      artist: 'Stromae',
    })

    const response = await client.get('/api/me/activities').bearerToken(token)
    response.assertStatus(200)

    const activities = response.body().activities
    assert.equal(activities.length, 2)
    const session = activities.find((a: any) => a.type === 'game_session')
    const like = activities.find((a: any) => a.type === 'liked_track')
    assert.exists(session)
    assert.exists(like)
    assert.equal(session.gameTitle, 'Blurchette Test')
    assert.equal(session.score, 8)
    assert.equal(session.maxScore, 10)
    assert.equal(like.trackTitle, 'Papaoutai')
    assert.equal(like.artist, 'Stromae')
  })

  test('respects the limit query parameter', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('act_idx_lim')
    for (let i = 0; i < 6; i++) {
      await UserTrackInteraction.create({
        userId: user.id,
        deezerTrackId: `t${i}`,
        action: InteractionAction.Liked,
        title: `Track ${i}`,
        artist: 'A',
      })
    }

    const response = await client.get('/api/me/activities?limit=3').bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().activities.length, 3)
  })

  test('returns 422 when limit is out of range', async ({ client }) => {
    const { token } = await createAuthenticatedUser('act_idx_bad')
    const response = await client.get('/api/me/activities?limit=99').bearerToken(token)
    response.assertStatus(422)
  })

  test('returns an empty array when the user has no events', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('act_idx_empty')
    const response = await client.get('/api/me/activities').bearerToken(token)
    response.assertStatus(200)
    assert.deepEqual(response.body().activities, [])
  })
})
