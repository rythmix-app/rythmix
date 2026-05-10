import { test } from '@japa/runner'
import MeActivitiesController from '#controllers/me_activities_controller'
import { HttpContext } from '@adonisjs/core/http'
import { makeResponse } from '#tests/utils/http_helpers'
import { errors } from '@vinejs/vine'

function makeCtx(validated: { limit?: number } = {}, validationError = false) {
  const response = makeResponse()
  const auth = { getUserOrFail: () => ({ id: 'user-1' }) } as any
  const request = {
    qs: () => ({}),
    validateUsing: async () => {
      if (validationError) {
        throw new errors.E_VALIDATION_ERROR([{ field: 'limit', message: 'out of range' }])
      }
      return validated
    },
  } as any
  return {
    response,
    ctx: { auth, request, response } as unknown as HttpContext,
  }
}

test.group('MeActivitiesController - Unit', () => {
  test('returns 200 with the activities on success', async ({ assert }) => {
    const activities = [
      {
        type: 'liked_track' as const,
        date: '2026-04-25T15:10:00Z',
        trackTitle: 'Papaoutai',
        artist: 'Stromae',
      },
    ]
    const service = {
      getRecentActivities: async () => activities,
    } as any
    const controller = new MeActivitiesController(service)
    const { response, ctx } = makeCtx()

    await controller.index(ctx)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, { activities })
  })

  test('falls back to the default limit when the query param is omitted', async ({ assert }) => {
    let receivedLimit: number | undefined
    const service = {
      getRecentActivities: async (_userId: string, limit: number) => {
        receivedLimit = limit
        return []
      },
    } as any
    const controller = new MeActivitiesController(service)
    const { ctx } = makeCtx()

    await controller.index(ctx)

    assert.equal(receivedLimit, 5)
  })

  test('forwards the limit query param to the service', async ({ assert }) => {
    let receivedLimit: number | undefined
    const service = {
      getRecentActivities: async (_userId: string, limit: number) => {
        receivedLimit = limit
        return []
      },
    } as any
    const controller = new MeActivitiesController(service)
    const { ctx } = makeCtx({ limit: 10 })

    await controller.index(ctx)

    assert.equal(receivedLimit, 10)
  })

  test('returns 422 when validation fails', async ({ assert }) => {
    const service = {
      getRecentActivities: async () => [],
    } as any
    const controller = new MeActivitiesController(service)
    const { response, ctx } = makeCtx({}, true)

    await controller.index(ctx)

    assert.equal(response.statusCode, 422)
    assert.equal(response.body.message, 'Validation failed')
  })

  test('returns 500 when the service throws an unexpected error', async ({ assert }) => {
    const service = {
      getRecentActivities: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new MeActivitiesController(service)
    const { response, ctx } = makeCtx()

    await controller.index(ctx)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Error while fetching activities')
  })
})
