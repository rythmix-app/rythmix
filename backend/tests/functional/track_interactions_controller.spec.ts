import { test } from '@japa/runner'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteTrackInteractions } from '#tests/utils/track_interaction_helpers'
import UserTrackInteraction from '#models/user_track_interaction'
import { InteractionAction } from '#enums/interaction_action'

test.group('TrackInteractionsController - auth guards', (group) => {
  deleteTrackInteractions(group)

  test('POST /api/me/swipemix/interactions requires auth', async ({ client }) => {
    const response = await client
      .post('/api/me/swipemix/interactions')
      .json({ deezerTrackId: '1', action: 'liked' })
    response.assertStatus(401)
  })

  test('GET /api/me/swipemix/interactions requires auth', async ({ client }) => {
    const response = await client.get('/api/me/swipemix/interactions')
    response.assertStatus(401)
  })

  test('DELETE /api/me/swipemix/interactions/:id requires auth', async ({ client }) => {
    const response = await client.delete('/api/me/swipemix/interactions/1')
    response.assertStatus(401)
  })
})

test.group('TrackInteractionsController - upsert', (group) => {
  deleteTrackInteractions(group)

  test('creates a liked interaction', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('ti_like')

    const response = await client.post('/api/me/swipemix/interactions').bearerToken(token).json({
      deezerTrackId: '3135556',
      deezerArtistId: '27',
      action: 'liked',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
    })

    response.assertStatus(200)
    assert.equal(response.body().interaction.action, 'liked')
    assert.equal(response.body().interaction.deezerTrackId, '3135556')
    assert.equal(response.body().interaction.userId, user.id)
  })

  test('creates a disliked interaction', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('ti_dislike')

    const response = await client.post('/api/me/swipemix/interactions').bearerToken(token).json({
      deezerTrackId: '4',
      action: 'disliked',
      title: 'Track',
      artist: 'Artist',
    })

    response.assertStatus(200)
    assert.equal(response.body().interaction.action, 'disliked')
  })

  test('upserts by flipping action when called twice on the same track', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('ti_flip')

    await client
      .post('/api/me/swipemix/interactions')
      .bearerToken(token)
      .json({ deezerTrackId: '42', action: 'liked', title: 't', artist: 'a' })

    const second = await client
      .post('/api/me/swipemix/interactions')
      .bearerToken(token)
      .json({ deezerTrackId: '42', action: 'disliked', title: 't', artist: 'a' })

    second.assertStatus(200)
    assert.equal(second.body().interaction.action, 'disliked')

    const rows = await UserTrackInteraction.query()
      .where('userId', user.id)
      .where('deezerTrackId', '42')
    assert.equal(rows.length, 1)
    assert.equal(rows[0].action, InteractionAction.Disliked)
  })

  test('rejects an invalid action', async ({ client }) => {
    const { token } = await createAuthenticatedUser('ti_invalid')

    const response = await client
      .post('/api/me/swipemix/interactions')
      .bearerToken(token)
      .json({ deezerTrackId: '1', action: 'maybe' })

    response.assertStatus(422)
  })

  test('rejects a missing deezerTrackId', async ({ client }) => {
    const { token } = await createAuthenticatedUser('ti_missing')

    const response = await client
      .post('/api/me/swipemix/interactions')
      .bearerToken(token)
      .json({ action: 'liked' })

    response.assertStatus(422)
  })
})

test.group('TrackInteractionsController - index', (group) => {
  deleteTrackInteractions(group)

  test('lists interactions for the authenticated user only', async ({ client, assert }) => {
    const { token: tokenA, user: userA } = await createAuthenticatedUser('ti_list_a')
    const { token: tokenB } = await createAuthenticatedUser('ti_list_b')

    await client
      .post('/api/me/swipemix/interactions')
      .bearerToken(tokenA)
      .json({ deezerTrackId: '1', action: 'liked' })
    await client
      .post('/api/me/swipemix/interactions')
      .bearerToken(tokenB)
      .json({ deezerTrackId: '2', action: 'disliked' })

    const response = await client.get('/api/me/swipemix/interactions').bearerToken(tokenA)
    response.assertStatus(200)
    assert.equal(response.body().interactions.length, 1)
    assert.equal(response.body().interactions[0].userId, userA.id)
  })

  test('returns 422 when the action query param is invalid', async ({ client }) => {
    const { token } = await createAuthenticatedUser('ti_invalid_filter')

    const response = await client
      .get('/api/me/swipemix/interactions?action=maybe')
      .bearerToken(token)

    response.assertStatus(422)
  })

  test('filters by action query param', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('ti_filter')

    await client
      .post('/api/me/swipemix/interactions')
      .bearerToken(token)
      .json({ deezerTrackId: '10', action: 'liked' })
    await client
      .post('/api/me/swipemix/interactions')
      .bearerToken(token)
      .json({ deezerTrackId: '20', action: 'disliked' })

    const response = await client
      .get('/api/me/swipemix/interactions?action=liked')
      .bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().interactions.length, 1)
    assert.equal(response.body().interactions[0].action, 'liked')
  })
})

test.group('TrackInteractionsController - delete', (group) => {
  deleteTrackInteractions(group)

  test('deletes an existing interaction', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('ti_delete')

    await client
      .post('/api/me/swipemix/interactions')
      .bearerToken(token)
      .json({ deezerTrackId: '77', action: 'liked' })

    const response = await client.delete('/api/me/swipemix/interactions/77').bearerToken(token)
    response.assertStatus(200)

    const exists = await UserTrackInteraction.query()
      .where('userId', user.id)
      .where('deezerTrackId', '77')
      .first()
    assert.isNull(exists)
  })

  test('returns 404 when no interaction exists', async ({ client }) => {
    const { token } = await createAuthenticatedUser('ti_delete_missing')

    const response = await client.delete('/api/me/swipemix/interactions/999').bearerToken(token)
    response.assertStatus(404)
  })
})
