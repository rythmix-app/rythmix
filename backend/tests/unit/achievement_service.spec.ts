import { test } from '@japa/runner'
import Achievement from '#models/achievement'
import { AchievementService } from '#services/achievement_service'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('AchievementService - CRUD Operations', (group) => {
  let achievementService: AchievementService

  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    achievementService = new AchievementService()
    await testUtils.db().truncate()
  })

  test('createAchievement should create a new achievement', async ({ assert }) => {
    const result = await achievementService.createAchievement({
      type: 'gold',
      description: 'First achievement',
    })

    assert.instanceOf(result, Achievement)
    if (result instanceof Achievement) {
      assert.equal(result.type, 'gold')
      assert.equal(result.description, 'First achievement')
    }
  })

  test('getAll should return all achievements', async ({ assert }) => {
    const a1 = await Achievement.create({ type: 'a', description: 'one' })
    const a2 = await Achievement.create({ type: 'b', description: 'two' })

    const all = await achievementService.getAll()
    assert.isAtLeast(all.length, 2)
    assert.exists(all.find((a) => a.id === a1.id))
    assert.exists(all.find((a) => a.id === a2.id))
  })

  test('getById should return achievement when found', async ({ assert }) => {
    const a = await Achievement.create({ type: 'x', description: 'findme' })
    const found = await achievementService.getById(a.id)
    assert.isNotNull(found)
    assert.equal(found?.id, a.id)
  })

  test('getById should return null when not found', async ({ assert }) => {
    const notFound = await achievementService.getById(999999)
    assert.isNull(notFound)
  })

  test('updateAchievement should update when exists', async ({ assert }) => {
    const a = await Achievement.create({ type: 'old', description: 'olddesc' })
    const result = await achievementService.updateAchievement(a.id, { description: 'newdesc', type: 'new' })
    assert.instanceOf(result, Achievement)
    if (result instanceof Achievement) {
      assert.equal(result.description, 'newdesc')
      assert.equal(result.type, 'new')
    }
  })

  test('updateAchievement should return error when not found', async ({ assert }) => {
    const result = await achievementService.updateAchievement(123456, { description: 'no' })
    assert.notInstanceOf(result, Achievement)
    if (!(result instanceof Achievement)) {
      assert.equal(result.error, 'Achievement not found')
      assert.equal(result.status, 404)
    }
  })

  test('deleteAchievement should delete existing achievement', async ({ assert }) => {
    const a = await Achievement.create({ type: 'del', description: 'todel' })
    const result = await achievementService.deleteAchievement(a.id)
    assert.equal(result.message, `Achievement with ID: ${a.id} deleted successfully`)
    const still = await Achievement.find(a.id)
    assert.isNull(still)
  })

  test('deleteAchievement should return error when not found', async ({ assert }) => {
    const result = await achievementService.deleteAchievement(555555)
    assert.equal(result.error, 'Achievement not found')
    assert.equal(result.status, 404)
  })
})
