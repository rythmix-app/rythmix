import { test } from '@japa/runner'
import Achievement from '#models/achievement'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('AchievementsController - CRUD Functional', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  test('GET /api/achievements should return list', async ({ client, assert }) => {
    await Achievement.create({ type: 't1', description: 'd1' })
    await Achievement.create({ type: 't2', description: 'd2' })

    const response = await client.get('/api/achievements')
    response.assertStatus(200)
    response.assertBodyContains({ message: 'List of achievements' })

    const data = response.body().data
    assert.isAtLeast(data.length, 2)
  })

  test('GET /api/achievements/:id should return details', async ({ client, assert }) => {
    const a = await Achievement.create({ type: 'single', description: 'detail' })
    const response = await client.get(`/api/achievements/${a.id}`)
    response.assertStatus(200)
    response.assertBodyContains({ message: `Achievement details for ID: ${a.id}` })
    const data = response.body().data
    assert.equal(data.id, a.id)
    assert.equal(data.type, a.type)
  })

  test('GET non-existent should return 404', async ({ client }) => {
    const response = await client.get('/api/achievements/9999999')
    response.assertStatus(404)
    response.assertBodyContains({ message: 'Achievement not found' })
  })

  test('POST /api/achievements should create achievement', async ({ client, assert }) => {
    const payload = { type: 'gold', description: 'created' }
    const response = await client.post('/api/achievements').json(payload)
    response.assertStatus(201)
    response.assertBodyContains({ message: 'Achievement created' })
    const created = response.body().data
    assert.equal(created.type, payload.type)
    assert.equal(created.description, payload.description)
  })

  test('PATCH /api/achievements/:id should update', async ({ client, assert }) => {
    const a = await Achievement.create({ type: 'old', description: 'old' })
    const response = await client
      .patch(`/api/achievements/${a.id}`)
      .json({ description: 'updated', type: 'new' })
    response.assertStatus(200)
    response.assertBodyContains({ message: 'Achievement updated' })
    const updated = response.body().data
    assert.equal(updated.description, 'updated')
    assert.equal(updated.type, 'new')
  })

  test('PATCH non-existent should return 404', async ({ client }) => {
    const response = await client.patch('/api/achievements/999999').json({ description: 'x' })
    response.assertStatus(404)
    response.assertBodyContains({ message: 'Achievement not found' })
  })

  test('DELETE /api/achievements/:id should remove achievement', async ({ client, assert }) => {
    const a = await Achievement.create({ type: 'todel', description: 'd' })
    const response = await client.delete(`/api/achievements/${a.id}`)
    response.assertStatus(200)
    response.assertBodyContains({ message: `Achievement with ID: ${a.id} deleted successfully` })
    const found = await Achievement.find(a.id)
    assert.isNull(found)
  })

  test('DELETE non-existent should return 404', async ({ client }) => {
    const response = await client.delete('/api/achievements/999999')

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Achievement not found' })
  })
})
