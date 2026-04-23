import { test } from '@japa/runner'
import UserAchievementsController from '#controllers/user_achievements_controller'
import { HttpContext } from '@adonisjs/core/http'
import { makeResponse } from '#tests/utils/http_helpers'

test.group('UserAchievementsController - Unit', () => {
  test('myAchievements returns 500 when service throws unexpectedly', async ({ assert }) => {
    const service = {
      getUserAchievements: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const auth = { user: { id: 'user-1' } }

    await controller.myAchievements({ auth, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Failed to retrieve user achievements/i)
  })

  test('index returns 500 when service throws unexpectedly', async ({ assert }) => {
    const service = {
      getAll: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Failed to retrieve user achievements/i)
  })

  test('create falls back to 500 when service returns an error without status', async ({
    assert,
  }) => {
    const service = {
      startTracking: async () => ({ error: 'Unspecified failure' }),
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const request = { only: () => ({ achievementId: 1 }) } as any
    const auth = { user: { id: 'user-1' } }

    await controller.create({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Unspecified failure')
  })

  test('updateProgress falls back to 500 when service returns an error without status', async ({
    assert,
  }) => {
    const service = {
      incrementProgress: async () => ({ error: 'Unspecified failure' }),
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const request = { only: () => ({ amount: 5 }) } as any
    const params = { id: 'ua-1' }
    const auth = { user: { id: 'user-1' } }

    await controller.updateProgress({ auth, params, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Unspecified failure')
  })

  test('delete falls back to 500 when service returns an error without status', async ({
    assert,
  }) => {
    const service = {
      removeTracking: async () => ({ error: 'Unspecified failure' }),
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const params = { id: 'ua-1' }
    const auth = { user: { id: 'user-1' } }

    await controller.delete({ auth, params, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Unspecified failure')
  })

  test('reset falls back to 500 when service returns an error without status', async ({
    assert,
  }) => {
    const service = {
      resetProgress: async () => ({ error: 'Unspecified failure' }),
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const params = { id: 'ua-1' }

    await controller.reset({ params, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Unspecified failure')
  })

  test('create returns 400 when requiredProgress is not a positive number', async ({ assert }) => {
    const service = {} as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const request = { only: () => ({ achievementId: 1, requiredProgress: -5 }) } as any
    const auth = { user: { id: 'user-1' } }

    await controller.create({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 400)
    assert.match(response.body.message, /requiredProgress must be a positive number/i)
  })

  test('create returns 500 when service throws unexpectedly', async ({ assert }) => {
    const service = {
      startTracking: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const request = { only: () => ({ achievementId: 1 }) } as any
    const auth = { user: { id: 'user-1' } }

    await controller.create({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Failed to start tracking achievement/i)
  })

  test('updateProgress returns 500 when service throws unexpectedly', async ({ assert }) => {
    const service = {
      incrementProgress: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const request = { only: () => ({ amount: 10 }) } as any
    const params = { id: 'ua-1' }
    const auth = { user: { id: 'user-1' } }

    await controller.updateProgress({ auth, params, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Failed to update progress/i)
  })

  test('delete returns 500 when service throws unexpectedly', async ({ assert }) => {
    const service = {
      removeTracking: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const auth = { user: { id: 'user-1' } }
    const params = { id: 'ua-1' }

    await controller.delete({ auth, params, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Failed to remove achievement tracking/i)
  })

  test('stats returns 500 when service throws unexpectedly', async ({ assert }) => {
    const service = {
      getUserStats: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const auth = { user: { id: 'user-1' } }

    await controller.stats({ auth, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Failed to retrieve statistics/i)
  })

  test('reset returns 500 when service throws unexpectedly', async ({ assert }) => {
    const service = {
      resetProgress: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new UserAchievementsController(service)

    const response = makeResponse()
    const params = { id: 'ua-1' }

    await controller.reset({ params, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Failed to reset progress/i)
  })
})
