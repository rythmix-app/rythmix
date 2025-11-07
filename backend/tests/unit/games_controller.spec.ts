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
})
