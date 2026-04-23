import { test } from '@japa/runner'
import GameSessionsController from '#controllers/game_sessions_controller'
import GameSession from '#models/game_session'
import { HttpContext } from '@adonisjs/core/http'
import { makeResponse } from '#tests/utils/http_helpers'

test.group('GameSessionsController - Unit', () => {
  test('index returns 200 with data on success', async ({ assert }) => {
    const service = {
      getAll: async () => [
        { id: '1', status: 'en_cours' },
        { id: '2', status: 'terminee' },
      ],
    } as any
    const controller = new GameSessionsController(service)
    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body.gameSessions, [
      { id: '1', status: 'en_cours' },
      { id: '2', status: 'terminee' },
    ])
  })

  test('index returns 500 when service throws', async ({ assert }) => {
    const service = {
      getAll: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)
    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching game sessions/i)
  })

  test('index returns 200 with empty list', async ({ assert }) => {
    const service = { getAll: async () => [] } as any
    const controller = new GameSessionsController(service)
    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body.gameSessions, [])
  })

  test('create returns 201 when service returns model', async ({ assert }) => {
    const model = new GameSession()
    model.gameId = 1
    model.status = 'active'
    ;(model as any).id = 'session-123'

    const service = { createGameSession: async () => model } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = {
      only: () => ({
        gameId: 1,
        status: 'en_cours',
        players: [],
        gameData: {},
      }),
    } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 201)
    assert.equal(response.body.gameSession.gameId, 1)
  })

  test('create returns mapped status when service returns error object', async ({ assert }) => {
    const service = {
      createGameSession: async () => ({
        error: 'Game not found',
        status: 404,
      }),
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { only: () => ({ gameId: 999 }) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 404)
    assert.match(response.body.message, /Game not found/i)
  })

  test('create returns 500 when service returns error object without status', async ({
    assert,
  }) => {
    const service = {
      createGameSession: async () => ({ error: 'Some error without status' }),
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { only: () => ({}) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Some error|Error/i)
  })

  test('create returns 500 when service throws', async ({ assert }) => {
    const service = {
      createGameSession: async () => {
        throw new Error('db down')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { only: () => ({}) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while creating game session/i)
  })

  test('show returns 200 with model when found', async ({ assert }) => {
    const service = { getById: async () => ({ id: 'session-77', status: 'en_cours' }) } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { id: 'session-77' }

    await controller.show({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.gameSession.id, 'session-77')
  })

  test('show returns 404 when not found', async ({ assert }) => {
    const service = { getById: async () => null } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { id: 'non-existent' }

    await controller.show({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 404)
    assert.match(response.body.message, /not found/i)
  })

  test('show returns 500 when service throws', async ({ assert }) => {
    const service = {
      getById: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { id: 'session-1' }

    await controller.show({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching game session/i)
  })

  test('update returns 200 with model on success', async ({ assert }) => {
    const model = new GameSession()
    model.status = 'completed'
    ;(model as any).id = 'session-5'

    const service = { updateGameSession: async () => model } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { only: () => ({ status: 'terminee' }) } as any
    const params = { id: 'session-5' }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    console.log(response.body)
    assert.equal(response.body.status, 'completed')
  })

  test('update returns mapped status when service returns error object', async ({ assert }) => {
    const service = {
      updateGameSession: async () => ({ error: 'GameSession not found', status: 404 }),
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { only: () => ({ status: 'terminee' }) } as any
    const params = { id: 'session-1' }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 404)
    assert.match(response.body.message, /not found/i)
  })

  test('update returns 500 when service returns error object without status', async ({
    assert,
  }) => {
    const service = { updateGameSession: async () => ({ error: 'Update failed' }) } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { only: () => ({ status: 'x' }) } as any
    const params = { id: 'session-1' }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Update failed|Error/i)
  })

  test('update returns 500 when service throws', async ({ assert }) => {
    const service = {
      updateGameSession: async () => {
        throw new Error('oops')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { only: () => ({ status: 'x' }) } as any
    const params = { id: 'session-1' }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while updating game session/i)
  })

  test('delete returns 200 with message on success', async ({ assert }) => {
    const service = {
      deleteGameSession: async () => ({
        message: 'GameSession with ID: session-10 deleted successfully',
      }),
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { id: 'session-10' }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.match(response.body.message, /deleted successfully/i)
  })

  test('delete returns mapped status when service returns error object', async ({ assert }) => {
    const service = {
      deleteGameSession: async () => ({ error: 'GameSession not found', status: 404 }),
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { id: 'session-11' }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 404)
    assert.match(response.body.message, /not found/i)
  })

  test('delete returns 500 when service returns error object without status', async ({
    assert,
  }) => {
    const service = { deleteGameSession: async () => ({ error: 'Delete failed' }) } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { id: 'session-1' }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Delete failed|Error/i)
  })

  test('delete returns 500 when service throws', async ({ assert }) => {
    const service = {
      deleteGameSession: async () => {
        throw new Error('oops')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { id: 'session-12' }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while deleting game session/i)
  })

  test('getByGame returns 200 with sessions for specific game', async ({ assert }) => {
    const service = {
      getByGameId: async () => [
        { id: 'session-1', gameId: 5 },
        { id: 'session-2', gameId: 5 },
      ],
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { gameId: '5' }

    await controller.getByGame({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.gameSessions.length, 2)
  })

  test('getByGame returns 400 for invalid gameId', async ({ assert }) => {
    const service = {} as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { gameId: 'abc' }

    await controller.getByGame({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 400)
    assert.match(response.body.message, /Invalid gameId/i)
  })

  test('getByGame returns 500 when service throws', async ({ assert }) => {
    const service = {
      getByGameId: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { gameId: '1' }

    await controller.getByGame({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching game sessions/i)
  })

  test('myGameStats returns 200 with stats on success', async ({ assert }) => {
    const mockStats = {
      totalPlayed: 5,
      bestScore: 18,
      averageScore: 12.4,
      averageTimeElapsed: 45.3,
      lastPlayedAt: '2026-04-15T10:00:00.000Z',
    }
    const service = { getGameStats: async () => mockStats } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const auth = { user: { id: 'user-1' } }
    const params = { gameId: '1' }

    await controller.myGameStats({ auth, params, response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, mockStats)
  })

  test('myGameStats returns 400 for invalid gameId', async ({ assert }) => {
    const service = {} as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const auth = { user: { id: 'user-1' } }
    const params = { gameId: 'notanumber' }

    await controller.myGameStats({ auth, params, response } as any as HttpContext)

    assert.equal(response.statusCode, 400)
    assert.match(response.body.message, /Invalid gameId/i)
  })

  test('myGameStats returns 500 when service throws', async ({ assert }) => {
    const service = {
      getGameStats: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const auth = { user: { id: 'user-1' } }
    const params = { gameId: '1' }

    await controller.myGameStats({ auth, params, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching game stats/i)
  })

  test('getByStatus returns 200 with sessions with valid status', async ({ assert }) => {
    const service = {
      getByStatus: async () => [
        { id: 'session-1', status: 'completed' },
        { id: 'session-2', status: 'completed' },
      ],
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { status: 'completed' }

    await controller.getByStatus({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.gameSessions.length, 2)
  })

  test('getByStatus returns 400 for invalid status', async ({ assert }) => {
    const service = {} as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { status: 'invalid_status' }

    await controller.getByStatus({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 400)
    assert.match(response.body.message, /Invalid status/i)
  })

  test('getByStatus returns 500 when service throws', async ({ assert }) => {
    const service = {
      getByStatus: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { status: 'completed' }

    await controller.getByStatus({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching game sessions/i)
  })

  test('mySessions returns 200 with the sessions for the authenticated user', async ({
    assert,
  }) => {
    const service = {
      getByUserId: async (userId: string, status?: string) => [
        { id: 's1', userId, status: status ?? 'active' },
      ],
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { qs: () => ({ status: 'active' }) } as any
    const auth = { user: { id: 'user-1' } }

    await controller.mySessions({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.lengthOf(response.body.gameSessions, 1)
    assert.equal(response.body.gameSessions[0].status, 'active')
  })

  test('mySessions returns 500 when service throws', async ({ assert }) => {
    const service = {
      getByUserId: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { qs: () => ({}) } as any
    const auth = { user: { id: 'user-1' } }

    await controller.mySessions({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching game sessions/i)
  })

  test('myGameHistory returns 200 with history from the service', async ({ assert }) => {
    const captured: any = {}
    const service = {
      getGameHistory: async (
        userId: string,
        gameId: number,
        status: string | undefined,
        page: number,
        limit: number
      ) => {
        captured.userId = userId
        captured.gameId = gameId
        captured.status = status
        captured.page = page
        captured.limit = limit
        return { meta: { total: 0 }, data: [] }
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { qs: () => ({ status: 'completed', page: '2', limit: '5' }) } as any
    const params = { gameId: '42' }
    const auth = { user: { id: 'user-7' } }

    await controller.myGameHistory({
      auth,
      params,
      request,
      response,
    } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(captured.userId, 'user-7')
    assert.equal(captured.gameId, 42)
    assert.equal(captured.status, 'completed')
    assert.equal(captured.page, 2)
    assert.equal(captured.limit, 5)
  })

  test('myGameHistory clamps negative pagination and limits to sane defaults', async ({
    assert,
  }) => {
    const captured: any = {}
    const service = {
      getGameHistory: async (
        _userId: string,
        _gameId: number,
        _status: string | undefined,
        page: number,
        limit: number
      ) => {
        captured.page = page
        captured.limit = limit
        return { data: [] }
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { qs: () => ({ page: '-3', limit: '500' }) } as any
    const params = { gameId: '1' }
    const auth = { user: { id: 'user-1' } }

    await controller.myGameHistory({
      auth,
      params,
      request,
      response,
    } as any as HttpContext)

    assert.equal(captured.page, 1)
    assert.equal(captured.limit, 100)
  })

  test('myGameHistory returns 400 for invalid gameId', async ({ assert }) => {
    const controller = new GameSessionsController({} as any)

    const response = makeResponse()
    const request = { qs: () => ({}) } as any
    const params = { gameId: 'not-a-number' }
    const auth = { user: { id: 'user-1' } }

    await controller.myGameHistory({
      auth,
      params,
      request,
      response,
    } as any as HttpContext)

    assert.equal(response.statusCode, 400)
    assert.match(response.body.message, /Invalid gameId/i)
  })

  test('myGameHistory returns 400 when status filter is not allowed', async ({ assert }) => {
    const controller = new GameSessionsController({} as any)

    const response = makeResponse()
    const request = { qs: () => ({ status: 'active' }) } as any
    const params = { gameId: '1' }
    const auth = { user: { id: 'user-1' } }

    await controller.myGameHistory({
      auth,
      params,
      request,
      response,
    } as any as HttpContext)

    assert.equal(response.statusCode, 400)
    assert.match(response.body.message, /Invalid status filter/i)
  })

  test('myGameHistory returns 500 when service throws', async ({ assert }) => {
    const service = {
      getGameHistory: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { qs: () => ({}) } as any
    const params = { gameId: '1' }
    const auth = { user: { id: 'user-1' } }

    await controller.myGameHistory({
      auth,
      params,
      request,
      response,
    } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching game session history/i)
  })

  test('myActiveSession returns 200 with the active session', async ({ assert }) => {
    const service = {
      getMyActiveSessionByGameId: async () => ({ id: 'session-active' }),
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { gameId: '7' }
    const auth = { user: { id: 'user-1' } }

    await controller.myActiveSession({ auth, params, response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.gameSession.id, 'session-active')
  })

  test('myActiveSession returns null when no active session exists', async ({ assert }) => {
    const service = {
      getMyActiveSessionByGameId: async () => null,
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { gameId: '7' }
    const auth = { user: { id: 'user-1' } }

    await controller.myActiveSession({ auth, params, response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.isNull(response.body.gameSession)
  })

  test('myActiveSession returns 400 for invalid gameId', async ({ assert }) => {
    const controller = new GameSessionsController({} as any)

    const response = makeResponse()
    const params = { gameId: 'abc' }
    const auth = { user: { id: 'user-1' } }

    await controller.myActiveSession({ auth, params, response } as any as HttpContext)

    assert.equal(response.statusCode, 400)
    assert.match(response.body.message, /Invalid gameId/i)
  })

  test('myActiveSession returns 500 when service throws', async ({ assert }) => {
    const service = {
      getMyActiveSessionByGameId: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { gameId: '1' }
    const auth = { user: { id: 'user-1' } }

    await controller.myActiveSession({ auth, params, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching active game session/i)
  })
})
