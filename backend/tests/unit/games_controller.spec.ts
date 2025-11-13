import { test } from '@japa/runner'
import GamesController from '#controllers/games_controller'
import { GameService } from '#services/game_service'
import Game from '#models/game'

test.group('GamesController - Unit Tests for Edge Cases', () => {
  test('create should use 500 status when service returns error without status', async ({
    assert,
  }) => {
    const mockService = {
      createGame: async () => ({ error: 'Something went wrong' }),
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 500)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'Something went wrong')
            return data
          },
        }
      },
    } as any

    const mockRequest = {
      only: () => ({ name: 'Test', description: 'Test' }),
    } as any

    const mockContext = {
      request: mockRequest,
      response: mockResponse,
    } as any

    await controller.create(mockContext)
  })

  test('update should use 500 status when service returns error without status', async ({
    assert,
  }) => {
    const mockService = {
      updateGame: async () => ({ error: 'Something went wrong' }),
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 500)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'Something went wrong')
            return data
          },
        }
      },
    } as any

    const mockRequest = {
      only: () => ({ name: 'Updated' }),
    } as any

    const mockContext = {
      request: mockRequest,
      response: mockResponse,
      params: { id: 1 },
    } as any

    await controller.update(mockContext)
  })

  test('index should return list when service succeeds', async ({ assert }) => {
    const mockGames = [
      { id: 1, name: 'Game 1', description: 'Desc 1' },
      { id: 2, name: 'Game 2', description: 'Desc 2' },
    ] as Game[]

    const mockService = {
      getAll: async () => mockGames,
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      json: (data: any) => {
        assert.equal(data.message, 'List of games')
        assert.equal(data.data, mockGames)
        return data
      },
    } as any

    const mockContext = {
      response: mockResponse,
    } as any

    await controller.index(mockContext)
  })

  test('show should return details when service succeeds', async ({ assert }) => {
    const mockGame = {
      id: 1,
      name: 'Test Game',
      description: 'Test Description',
    } as Game

    const mockService = {
      getById: async () => mockGame,
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      json: (data: any) => {
        assert.equal(data.message, 'Game details for ID: 1')
        assert.equal(data.data, mockGame)
        return data
      },
    } as any

    const mockContext = {
      response: mockResponse,
      params: { id: 1 },
    } as any

    await controller.show(mockContext)
  })

  test('show should return 404 when service returns null', async ({ assert }) => {
    const mockService = {
      getById: async () => null,
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 404)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'Game not found')
            return data
          },
        }
      },
    } as any

    const mockContext = {
      response: mockResponse,
      params: { id: 999 },
    } as any

    await controller.show(mockContext)
  })

  test('destroy should return message when service succeeds', async ({ assert }) => {
    const mockService = {
      deleteGame: async () => ({ message: 'Game with ID: 1 deleted successfully' }),
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      json: (data: any) => {
        assert.equal(data.message, 'Game with ID: 1 deleted successfully')
        return data
      },
    } as any

    const mockContext = {
      response: mockResponse,
      params: { id: 1 },
    } as any

    await controller.destroy(mockContext)
  })

  test('destroy should return error status when service returns error', async ({ assert }) => {
    const mockService = {
      deleteGame: async () => ({ error: 'Game not found', status: 404 }),
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 404)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'Game not found')
            return data
          },
        }
      },
    } as any

    const mockContext = {
      response: mockResponse,
      params: { id: 999 },
    } as any

    await controller.destroy(mockContext)
  })

  test('create should return 500 when service throws', async ({ assert }) => {
    const mockService = {
      createGame: async () => {
        throw new Error('Database connection failed')
      },
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 500)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'An unexpected error occurred')
            assert.equal(data.error, 'Database connection failed')
            return data
          },
        }
      },
    } as any

    const mockRequest = {
      only: () => ({ name: 'Test', description: 'Test' }),
    } as any

    const mockContext = {
      request: mockRequest,
      response: mockResponse,
    } as any

    await controller.create(mockContext)
  })

  test('show should return 500 when service throws', async ({ assert }) => {
    const mockService = {
      getById: async () => {
        throw new Error('Database error')
      },
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 500)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'An error occurred while retrieving the game')
            assert.equal(data.error, 'Database error')
            return data
          },
        }
      },
    } as any

    const mockContext = {
      response: mockResponse,
      params: { id: 1 },
    } as any

    await controller.show(mockContext)
  })

  test('update should return 500 when service throws', async ({ assert }) => {
    const mockService = {
      updateGame: async () => {
        throw new Error('Unexpected error')
      },
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 500)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'An unexpected error occurred')
            assert.equal(data.error, 'Unexpected error')
            return data
          },
        }
      },
    } as any

    const mockRequest = {
      only: () => ({ name: 'Updated' }),
    } as any

    const mockContext = {
      request: mockRequest,
      response: mockResponse,
      params: { id: 1 },
    } as any

    await controller.update(mockContext)
  })

  test('destroy should return 500 when service throws', async ({ assert }) => {
    const mockService = {
      deleteGame: async () => {
        throw new Error('Critical error')
      },
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 500)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'An unexpected error occurred while deleting the game.')
            assert.equal(data.error, 'Critical error')
            return data
          },
        }
      },
    } as any

    const mockContext = {
      response: mockResponse,
      params: { id: 1 },
    } as any

    await controller.destroy(mockContext)
  })

  test('index should return 500 when service throws', async ({ assert }) => {
    const mockService = {
      getAll: async () => {
        throw new Error('Failed to fetch')
      },
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 500)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'Failed to fetch games')
            assert.equal(data.error, 'Failed to fetch')
            return data
          },
        }
      },
    } as any

    const mockContext = {
      response: mockResponse,
    } as any

    await controller.index(mockContext)
  })

  test('index should return 500 with fallback error when thrown error has no message', async ({ assert }) => {
    const mockService = {
      getAll: async () => {
        throw 'String error without message property'
      },
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 500)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'Failed to fetch games')
            assert.equal(data.error, 'String error without message property')
            return data
          },
        }
      },
    } as any

    const mockContext = {
      response: mockResponse,
    } as any

    await controller.index(mockContext)
  })

  test('destroy should return 500 with fallback error when thrown error has no message', async ({ assert }) => {
    const mockService = {
      deleteGame: async () => {
        throw { code: 'UNKNOWN_ERROR', details: 'Something went wrong' }
      },
    } as unknown as GameService

    const controller = new GamesController(mockService)

    const mockResponse = {
      status: (code: number) => {
        assert.equal(code, 500)
        return {
          json: (data: any) => {
            assert.equal(data.message, 'An unexpected error occurred while deleting the game.')
            assert.deepEqual(data.error, { code: 'UNKNOWN_ERROR', details: 'Something went wrong' })
            return data
          },
        }
      },
    } as any

    const mockContext = {
      response: mockResponse,
      params: { id: 1 },
    } as any

    await controller.destroy(mockContext)
  })
})
