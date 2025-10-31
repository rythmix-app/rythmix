// TypeScript
// File: `backend/tests/unit/achievements_controller.spec.ts`
import { test } from '@japa/runner'
import AchievementsController from '#controllers/achievements_controller'
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
  test('create should use 500 status when model throws', async ({ assert }) => {
    const originalCreate = (Achievement as any).create
    ;(Achievement as any).create = async () => {
      throw new Error('Unexpected error')
    }

    const controller = new AchievementsController()

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
      assert.match(mockResponse.body?.message, /Erreur lors de la création/)
    } finally {
      ;(Achievement as any).create = originalCreate
    }
  })

  test('update should use 500 status when model throws', async ({ assert }) => {
    const originalFind = (Achievement as any).find
    ;(Achievement as any).find = async () => {
      throw new Error('Unexpected error')
    }

    const controller = new AchievementsController()

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
      assert.match(mockResponse.body?.message, /Erreur lors de la mise à jour/)
    } finally {
      ;(Achievement as any).find = originalFind
    }
  })

  test('index should use 500 status when Achievement.all throws', async ({ assert }) => {
    const originalAll = (Achievement as any).all
    ;(Achievement as any).all = async () => {
      throw new Error('boom index')
    }

    const controller = new AchievementsController()
    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse } as any as HttpContext

    try {
      // @ts-ignore
      await controller.index(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.match(mockResponse.body?.message, /Erreur lors de la récupération/)
    } finally {
      ;(Achievement as any).all = originalAll
    }
  })

  test('show should use 500 status when find throws', async ({ assert }) => {
    const originalFind = (Achievement as any).find
    ;(Achievement as any).find = async () => {
      throw new Error('boom show')
    }

    const controller = new AchievementsController()
    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse, params: { id: 1 } } as any as HttpContext

    try {
      // @ts-ignore
      await controller.show(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.match(mockResponse.body?.message, /Erreur lors de la récupération/)
    } finally {
      ;(Achievement as any).find = originalFind
    }
  })

  test('destroy should use 500 status when find throws', async ({ assert }) => {
    const originalFind = (Achievement as any).find
    ;(Achievement as any).find = async () => {
      throw new Error('boom destroy')
    }

    const controller = new AchievementsController()
    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse, params: { id: 1 } } as any as HttpContext

    try {
      // @ts-ignore
      await controller.destroy(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.match(mockResponse.body?.message, /Erreur lors de la suppression/)
    } finally {
      ;(Achievement as any).find = originalFind
    }
  })
})
