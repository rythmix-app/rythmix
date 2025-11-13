import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'

async function createUser(tag: string) {
  return User.create({
    username: `u_${tag}_${Date.now()}`,
    email: `u_${tag}_${Date.now()}@example.com`,
    password: 'password123',
  })
}

test.group('LikedTracksController - Functional', (group) => {
  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  test('GET /api/liked-tracks returns empty list', async ({ client, assert }) => {
    const res = await client.get('/api/liked-tracks')
    res.assertStatus(200)
    assert.isArray(res.body().likedTracks)
  })

  test('POST /api/liked-tracks creates record', async ({ client, assert }) => {
    const user = await createUser('post')
    const payload = {
      userId: user.id,
      spotifyId: 'sp',
      title: 'Song',
      artist: 'Artist',
      type: 'like',
    }

    const res = await client.post('/api/liked-tracks').json(payload)

    res.assertStatus(201)
    assert.equal(res.body().likedTrack.userId, payload.userId)
  })

  test('PATCH /api/liked-tracks/:id updates record', async ({ client, assert }) => {
    const user = await createUser('patch')
    const rec = await user.related('likedTracks').create({ spotifyId: 'sp', title: 'Old' })

    const res = await client.patch(`/api/liked-tracks/${rec.id}`).json({ title: 'New' })

    res.assertStatus(200)
    assert.equal(res.body().likedTrack.title, 'New')
  })

  test('DELETE /api/liked-tracks/:id deletes record', async ({ client }) => {
    const user = await createUser('delete')
    const rec = await user.related('likedTracks').create({ spotifyId: 'x' })

    const res = await client.delete(`/api/liked-tracks/${rec.id}`)

    res.assertStatus(200)
  })
})
