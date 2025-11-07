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

test.group('LickedTracksController - Functional', (group) => {
  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  test('GET /api/licked-tracks returns empty list', async ({ client, assert }) => {
    const res = await client.get('/api/licked-tracks')
    res.assertStatus(200)
    assert.isArray(res.body().data)
  })

  test('POST /api/licked-tracks creates record', async ({ client, assert }) => {
    const user = await createUser('post')
    const payload = {
      userId: user.id,
      spotifyId: 'sp',
      title: 'Song',
      artist: 'Artist',
      type: 'like',
    }

    const res = await client.post('/api/licked-tracks').json(payload)

    res.assertStatus(201)
    assert.equal(res.body().data.userId, payload.userId)
  })

  test('PATCH /api/licked-tracks/:id updates record', async ({ client, assert }) => {
    const user = await createUser('patch')
    const rec = await user.related('likedTracks').create({ spotifyId: 'sp', title: 'Old' })

    const res = await client.patch(`/api/licked-tracks/${rec.id}`).json({ title: 'New' })

    res.assertStatus(200)
    assert.equal(res.body().data.title, 'New')
  })

  test('DELETE /api/licked-tracks/:id deletes record', async ({ client }) => {
    const user = await createUser('delete')
    const rec = await user.related('likedTracks').create({ spotifyId: 'x' })

    const res = await client.delete(`/api/licked-tracks/${rec.id}`)

    res.assertStatus(200)
  })
})
