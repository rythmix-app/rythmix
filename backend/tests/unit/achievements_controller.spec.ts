// TypeScript
// File: `backend/tests/unit/achievements_controller.spec.ts`
import { test } from '@japa/runner'
import AchievementsController from '#controllers/achievements_controller'
import AchievementService from '#services/achievement_service'
import Achievement from '#models/achievement'
import { HttpContext } from '@adonisjs/core/http'

const makeMockResponse = () => {
  return {
    statusCode: 0,
    body: null as any,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      return this
    },
  }
}

test.group('AchievementsController - Unit Tests for Edge Cases', () => {
  test('create should use 500 status when service returns error', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).createAchievement
    ;(service as any).createAchievement = async () => ({ error: 'boom', status: 500 })

    const mockResponse = makeMockResponse()

    const mockRequest = {
      only: () => ({
        type: 'test',
        description: 'desc',
      }),
    }

    const ctx = {
      request: mockRequest,
      response: mockResponse,
    } as any as HttpContext

    try {
      // @ts-ignore
      await controller.create(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.equal(mockResponse.body?.message, 'boom')
    } finally {
      ;(service as any).createAchievement = original
    }
  })

  test('create should return 500 when service throws', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).createAchievement
    ;(service as any).createAchievement = async () => {
      throw new Error('boom create')
    }

    const mockResponse = makeMockResponse()

    const mockRequest = {
      only: () => ({ type: 'test', description: 'desc' }),
    }

    const ctx = {
      request: mockRequest,
      response: mockResponse,
    } as any as HttpContext

    try {
      // @ts-ignore
      await controller.create(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.match(mockResponse.body?.message, /Error while creating/) // english
    } finally {
      ;(service as any).createAchievement = original
    }
  })

  test('update should use 500 status when service throws', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).updateAchievement
    ;(service as any).updateAchievement = async () => ({ error: 'boom update', status: 500 })

    const mockResponse = makeMockResponse()

    const mockRequest = {
      only: () => ({
        description: 'Test',
      }),
    }

    const ctx = {
      request: mockRequest,
      response: mockResponse,
      params: { id: 1 },
    } as any as HttpContext

    try {
      // @ts-ignore
      await controller.update(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.equal(mockResponse.body?.message, 'boom update')
    } finally {
      ;(service as any).updateAchievement = original
    }
  })

  test('index should use 500 status when service throws', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const originalAll = (service as any).getAll
    ;(service as any).getAll = async () => {
      throw new Error('boom index')
    }

    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse } as any as HttpContext

    try {
      // @ts-ignore
      await controller.index(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.match(mockResponse.body?.message, /Error while fetching/) // controller should return english message
    } finally {
      ;(service as any).getAll = originalAll
    }
  })

  test('show should use 500 status when service throws', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const originalFind = (service as any).getById
    ;(service as any).getById = async () => {
      throw new Error('boom show')
    }

    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse, params: { id: 1 } } as any as HttpContext

    try {
      // @ts-ignore
      await controller.show(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.match(mockResponse.body?.message, /Error while fetching/) // english
    } finally {
      ;(service as any).getById = originalFind
    }
  })

  test('delete should use 500 status when service returns error', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).deleteAchievement
    ;(service as any).deleteAchievement = async () => ({ error: 'boom delete', status: 500 })

    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse, params: { id: 1 } } as any as HttpContext

    try {
      // @ts-ignore
      await controller.delete(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.equal(mockResponse.body?.message, 'boom delete')
    } finally {
      ;(service as any).deleteAchievement = original
    }
  })

  test('delete should use 500 status when service throws', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).deleteAchievement
    ;(service as any).deleteAchievement = async () => {
      throw new Error('boom delete')
    }

    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse, params: { id: 1 } } as any as HttpContext

    try {
      // @ts-ignore
      await controller.delete(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.match(mockResponse.body?.message, /Error while deleting/) // english
    } finally {
      ;(service as any).deleteAchievement = original
    }
  })

  test('index should return list when service succeeds', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).getAll
    ;(service as any).getAll = async () => [{ id: 1, type: 't' }]

    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse } as any as HttpContext

    try {
      // @ts-ignore
      await controller.index(ctx)
      assert.equal(mockResponse.body?.message, 'List of achievements')
      assert.isArray(mockResponse.body?.data)
    } finally {
      ;(service as any).getAll = original
    }
  })

  test('create should return 201 and created achievement when service succeeds', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).createAchievement
    const fakeAchievement: any = Object.create(Achievement.prototype)
    fakeAchievement.id = 1
    fakeAchievement.type = 'created'
    fakeAchievement.description = 'desc'
    ;(service as any).createAchievement = async () => fakeAchievement

    const mockResponse = makeMockResponse()
    const mockRequest = { only: () => ({ type: 'created', description: 'desc' }) }
    const ctx = { request: mockRequest, response: mockResponse } as any as HttpContext

    try {
      // @ts-ignore
      await controller.create(ctx)
      assert.equal(mockResponse.statusCode, 201)
      // prefer checking returned data rather than message to avoid fragile instanceof checks
      assert.exists(mockResponse.body?.data)
      assert.equal(mockResponse.body?.data, fakeAchievement)
    } finally {
      ;(service as any).createAchievement = original
    }
  })

  test('show should return details when service succeeds', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).getById
    const fakeAchievement: any = { id: 2, type: 'show' }
    ;(service as any).getById = async () => fakeAchievement

    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse, params: { id: 2 } } as any as HttpContext

    try {
      // @ts-ignore
      await controller.show(ctx)
      assert.equal(mockResponse.body?.message, `Achievement details for ID: ${2}`)
      assert.equal(mockResponse.body?.data, fakeAchievement)
    } finally {
      ;(service as any).getById = original
    }
  })

  test('update should return updated when service succeeds', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).updateAchievement
    const fakeAchievement: any = Object.create(Achievement.prototype)
    fakeAchievement.id = 3
    fakeAchievement.type = 'updated'
    fakeAchievement.description = 'upd'
    ;(service as any).updateAchievement = async () => fakeAchievement

    const mockResponse = makeMockResponse()
    const mockRequest = { only: () => ({ description: 'upd' }) }
    const ctx = { response: mockResponse, params: { id: 3 }, request: mockRequest } as any as HttpContext

    try {
      // @ts-ignore
      await controller.update(ctx)
      assert.exists(mockResponse.body?.data)
      assert.equal(mockResponse.body?.data, fakeAchievement)
    } finally {
      ;(service as any).updateAchievement = original
    }
  })

  test('delete should return message when service succeeds', async ({ assert }) => {
    const service = new AchievementService()
    const controller = new AchievementsController(service as any)

    const original = (service as any).deleteAchievement
    ;(service as any).deleteAchievement = async () => ({ message: 'deleted' })

    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse, params: { id: 4 } } as any as HttpContext

    try {
      // @ts-ignore
      await controller.delete(ctx)
      assert.equal(mockResponse.body?.message, 'deleted')
    } finally {
      ;(service as any).deleteAchievement = original
    }
  })
})
