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
    const result = await achievementService.updateAchievement(a.id, {
      description: 'newdesc',
      type: 'new',
    })
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

  test('createAchievement should return 409 on unique violation', async ({ assert }) => {
    const originalCreate = (Achievement as any).create
    ;(Achievement as any).create = async () => {
      const e: any = new Error('dup')
      e.code = '23505'
      throw e
    }

    try {
      const result = await achievementService.createAchievement({ type: 'gold', description: 'dup' })
      assert.notInstanceOf(result, Achievement)
      if (!(result instanceof Achievement)) {
        assert.equal(result.error, 'Achievement already exists')
        assert.equal(result.status, 409)
      }
    } finally {
      ;(Achievement as any).create = originalCreate
    }
  })

  test('createAchievement should return 400 on field length violation', async ({ assert }) => {
    const originalCreate = (Achievement as any).create
    ;(Achievement as any).create = async () => {
      const e: any = new Error('length')
      e.code = '22001'
      throw e
    }

    try {
      const result = await achievementService.createAchievement({ type: 'x'.repeat(300), description: 'big' })
      assert.notInstanceOf(result, Achievement)
      if (!(result instanceof Achievement)) {
        assert.equal(result.error, 'One or more fields exceed maximum length')
        assert.equal(result.status, 400)
      }
    } finally {
      ;(Achievement as any).create = originalCreate
    }
  })

  test('updateAchievement should return 409 when save conflicts', async ({ assert }) => {
    const originalQuery = (Achievement as any).query
    const fakeRecord: any = {
      merge() {},
      save: async () => {
        const e: any = new Error('dup')
        e.code = '23505'
        throw e
      },
    }
    ;(Achievement as any).query = () => ({ where: () => ({ first: async () => fakeRecord }) })

    try {
      const result = await achievementService.updateAchievement(123, { description: 'x' })
      assert.notInstanceOf(result, Achievement)
      if (!(result instanceof Achievement)) {
        assert.equal(result.error, 'Conflict when updating achievement')
        assert.equal(result.status, 409)
      }
    } finally {
      ;(Achievement as any).query = originalQuery
    }
  })

  test('updateAchievement should return 400 when save length violation', async ({ assert }) => {
    const originalQuery = (Achievement as any).query
    const fakeRecord: any = {
      merge() {},
      save: async () => {
        const e: any = new Error('length')
        e.code = '22001'
        throw e
      },
    }
    ;(Achievement as any).query = () => ({ where: () => ({ first: async () => fakeRecord }) })

    try {
      const result = await achievementService.updateAchievement(123, { description: 'x' })
      assert.notInstanceOf(result, Achievement)
      if (!(result instanceof Achievement)) {
        assert.equal(result.error, 'One or more fields exceed maximum length')
        assert.equal(result.status, 400)
      }
    } finally {
      ;(Achievement as any).query = originalQuery
    }
  })

  test('createAchievement should rethrow unknown errors', async ({ assert }) => {
    const originalCreate = (Achievement as any).create
    ;(Achievement as any).create = async () => {
      throw new Error('unknown create error')
    }

    try {
      try {
        await achievementService.createAchievement({ type: 'x', description: 'y' })
        // If we get here, the error was not thrown
        assert.fail('createAchievement did not rethrow unknown error')
      } catch (err: any) {
        assert.match(err.message, /unknown create error/)
      }
    } finally {
      ;(Achievement as any).create = originalCreate
    }
  })

  test('updateAchievement should rethrow unknown save errors', async ({ assert }) => {
    const originalQuery = (Achievement as any).query
    const fakeRecord: any = {
      merge() {},
      save: async () => {
        throw new Error('unknown save error')
      },
    }
    ;(Achievement as any).query = () => ({ where: () => ({ first: async () => fakeRecord }) })

    try {
      try {
        await achievementService.updateAchievement(123, { description: 'x' })
        assert.fail('updateAchievement did not rethrow unknown save error')
      } catch (err: any) {
        assert.match(err.message, /unknown save error/)
      }
    } finally {
      ;(Achievement as any).query = originalQuery
    }
  })

  test('createAchievement should return created object when model.create succeeds (mocked)', async ({ assert }) => {
    const originalCreate = (Achievement as any).create
    const fakeAchievement: any = { id: 999, type: 'mocked', description: 'mock' }
    ;(Achievement as any).create = async (payload: any) => ({ ...fakeAchievement, ...payload })

    try {
      const result = await achievementService.createAchievement({ type: 'mocked', description: 'mock' })
      // should return the fake object
      assert.equal((result as any).type, 'mocked')
      assert.equal((result as any).description, 'mock')
    } finally {
      ;(Achievement as any).create = originalCreate
    }
  })

  test('getAll should return mocked list when model.query mocked', async ({ assert }) => {
    const originalQuery = (Achievement as any).query
    ;(Achievement as any).query = () => [{ id: 1, type: 'q' }]

    try {
      const all = await achievementService.getAll()
      assert.isArray(all)
      assert.isAtLeast(all.length, 1)
    } finally {
      ;(Achievement as any).query = originalQuery
    }
  })

  test('getById should return mocked record when model.query.first mocked', async ({ assert }) => {
    const originalQuery = (Achievement as any).query
    ;(Achievement as any).query = () => ({ where: () => ({ first: async () => ({ id: 5, type: 'byid' }) }) })

    try {
      const res = await achievementService.getById(5)
      assert.isNotNull(res)
      assert.equal(res?.id, 5)
    } finally {
      ;(Achievement as any).query = originalQuery
    }
  })

  test('deleteAchievement should delete and return message when instance found (mocked)', async ({ assert }) => {
    const originalQuery = (Achievement as any).query
    let deleted = false
    const fakeRecord: any = { delete: async () => { deleted = true } }
    ;(Achievement as any).query = () => ({ where: () => ({ first: async () => fakeRecord }) })

    try {
      const res = await achievementService.deleteAchievement(777)
      assert.equal((res as any).message, `Achievement with ID: ${777} deleted successfully`)
      assert.isTrue(deleted)
    } finally {
      ;(Achievement as any).query = originalQuery
    }
  })

  test('deleteAchievement should return not-found when instance missing (mocked)', async ({ assert }) => {
    const originalQuery = (Achievement as any).query
    ;(Achievement as any).query = () => ({ where: () => ({ first: async () => null }) })

    try {
      const res = await achievementService.deleteAchievement(888)
      assert.equal((res as any).error, 'Achievement not found')
      assert.equal((res as any).status, 404)
    } finally {
      ;(Achievement as any).query = originalQuery
    }
  })
})
