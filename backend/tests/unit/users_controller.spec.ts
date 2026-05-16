import { test } from '@japa/runner'
import UsersController from '#controllers/users_controller'
import { HttpContext } from '@adonisjs/core/http'

test.group('UsersController - Unit Tests for Edge Cases', () => {
  test('create should use 500 status when error has no status field', async ({ assert }) => {
    const mockUserService = {
      createUser: async () => ({
        error: 'Unexpected error',
      }),
    } as any

    const controller = new UsersController(mockUserService)

    const mockResponse = {
      statusCode: 0,
      status: function (code: number) {
        this.statusCode = code
        return this
      },
      json: function () {
        return this
      },
    }

    const mockRequest = {
      only: () => ({
        username: 'test',
        email: 'test@example.com',
        password: 'password',
      }),
    }

    const ctx = {
      request: mockRequest,
      response: mockResponse,
    } as any as HttpContext

    await controller.create(ctx)

    assert.equal(mockResponse.statusCode, 500)
  })

  test('index should call getAllWithTrashed when includeDeleted=true', async ({ assert }) => {
    let getAllCalled = false
    let getAllWithTrashedCalled = false

    const mockUserService = {
      getAll: async () => {
        getAllCalled = true
        return []
      },
      getAllWithTrashed: async () => {
        getAllWithTrashedCalled = true
        return []
      },
    } as any

    const controller = new UsersController(mockUserService)

    const mockResponse = {
      json: () => undefined,
    }

    const mockRequest = {
      input: (key: string) => (key === 'includeDeleted' ? 'true' : undefined),
    }

    await controller.index({
      request: mockRequest,
      response: mockResponse,
    } as any as HttpContext)

    assert.isTrue(getAllWithTrashedCalled)
    assert.isFalse(getAllCalled)
  })

  test('update should use 500 status when error has no status field', async ({ assert }) => {
    const mockUserService = {
      updateUser: async () => ({
        error: 'Unexpected error',
      }),
    } as any

    const controller = new UsersController(mockUserService)

    const mockResponse = {
      statusCode: 0,
      status: function (code: number) {
        this.statusCode = code
        return this
      },
      json: function () {
        return this
      },
    }

    const mockRequest = {
      only: () => ({
        firstName: 'Test',
      }),
    }

    const ctx = {
      request: mockRequest,
      response: mockResponse,
      params: { id: 'test-id' },
    } as any as HttpContext

    await controller.update(ctx)

    assert.equal(mockResponse.statusCode, 500)
  })

  test('verify should use 500 status when error has no status field', async ({ assert }) => {
    const mockUserService = {
      verifyUser: async () => ({
        error: 'Unexpected error',
      }),
    } as any

    const controller = new UsersController(mockUserService)

    const mockResponse = {
      statusCode: 0,
      status: function (code: number) {
        this.statusCode = code
        return this
      },
      json: function () {
        return this
      },
    }

    const ctx = {
      response: mockResponse,
      params: { id: 'test-id' },
    } as any as HttpContext

    await controller.verify(ctx)

    assert.equal(mockResponse.statusCode, 500)
  })
})
