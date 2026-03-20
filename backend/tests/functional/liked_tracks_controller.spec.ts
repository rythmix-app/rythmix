import { test } from '@japa/runner'
import User from '#models/user'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteLikedTrack } from '#tests/utils/liked_track_helpers'

async function createUser(tag: string) {
  return User.create({
    username: `u_${tag}_${Date.now()}`,
    email: `u_${tag}_${Date.now()}@example.com`,
    password: 'password123',
  })
}

test.group('LikedTracksController - Functional', (group) => {
  deleteLikedTrack(group)

  test('GET /api/liked-tracks returns empty list', async ({ client, assert }) => {
    const res = await client.get('/api/liked-tracks')
    res.assertStatus(200)
    assert.isArray(res.body().likedTracks)
  })

  test('POST /api/liked-tracks creates record', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('post')
    const user = await createUser('post')
    const payload = {
      userId: user.id,
      spotifyId: 'sp',
      title: 'Song',
      artist: 'Artist',
      type: 'like',
    }

    const res = await client.post('/api/liked-tracks').bearerToken(token).json(payload)

    res.assertStatus(201)
    assert.equal(res.body().likedTrack.userId, payload.userId)
  })

  test('GET /api/liked-tracks/me returns only authenticated user liked tracks', async ({
    client,
    assert,
  }) => {
    const { token, user } = await createAuthenticatedUser('get_me')
    const otherUser = await createUser('get_me_other')

    await user.related('likedTracks').create({ spotifyId: 'my_sp', title: 'Mine' })
    await otherUser.related('likedTracks').create({ spotifyId: 'other_sp', title: 'Other' })

    const res = await client.get('/api/liked-tracks/me').bearerToken(token)

    res.assertStatus(200)
    assert.isArray(res.body().likedTracks)
    assert.equal(res.body().likedTracks.length, 1)
    assert.equal(res.body().likedTracks[0].userId, user.id)
    assert.equal(res.body().likedTracks[0].spotifyId, 'my_sp')
  })

  test('POST /api/liked-tracks/me creates record for authenticated user', async ({
    client,
    assert,
  }) => {
    const { token, user } = await createAuthenticatedUser('post_me')
    const payload = {
      spotifyId: 'sp_me',
      title: 'Song Me',
      artist: 'Artist Me',
      type: 'like',
    }

    const res = await client.post('/api/liked-tracks/me').bearerToken(token).json(payload)

    res.assertStatus(201)
    assert.equal(res.body().likedTrack.userId, user.id)
    assert.equal(res.body().likedTrack.spotifyId, payload.spotifyId)
  })

  test('PATCH /api/liked-tracks/:id updates record', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('patch')
    const user = await createUser('patch')
    const rec = await user.related('likedTracks').create({ spotifyId: 'sp', title: 'Old' })

    const res = await client
      .patch(`/api/liked-tracks/${rec.id}`)
      .bearerToken(token)
      .json({ title: 'New' })

    res.assertStatus(200)
    assert.equal(res.body().likedTrack.title, 'New')
  })

  test('DELETE /api/liked-tracks/:id deletes record', async ({ client }) => {
    const { token } = await createAuthenticatedUser('delete')
    const user = await createUser('delete')
    const rec = await user.related('likedTracks').create({ spotifyId: 'x' })

    const res = await client.delete(`/api/liked-tracks/${rec.id}`).bearerToken(token)

    res.assertStatus(200)
  })
})
