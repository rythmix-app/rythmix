import { test } from '@japa/runner'
import GameSessionsController from '#controllers/game_sessions_controller'
import GameSession from '#models/game_session'
import { HttpContext } from '@adonisjs/core/http'

const makeResponse = () => ({
  statusCode: 200,
  body: null as any,
  status(code: number) {
    this.statusCode = code
    return this
  },
  json(payload: any) {
    this.body = payload
    return this
  },
})

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
    assert.deepEqual(response.body.data, [
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
    assert.deepEqual(response.body.data, [])
  })

  test('create returns 201 when service returns model', async ({ assert }) => {
    const model = new GameSession()
    model.gameId = 1
    model.status = 'en_cours'
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
    assert.equal(response.body.data.gameId, 1)
    assert.equal(response.body.message, 'Game session created')
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
    assert.equal(response.body.data.id, 'session-77')
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
    model.status = 'terminee'
    ;(model as any).id = 'session-5'

    const service = { updateGameSession: async () => model } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const request = { only: () => ({ status: 'terminee' }) } as any
    const params = { id: 'session-5' }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.status, 'terminee')
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
      deleteGameSession: async () => ({ message: 'GameSession with ID: session-10 deleted successfully' }),
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
    const params = { gameId: 5 }

    await controller.getByGame({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.length, 2)
    assert.match(response.body.message, /game ID: 5/i)
  })

  test('getByGame returns 500 when service throws', async ({ assert }) => {
    const service = {
      getByGameId: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { gameId: 1 }

    await controller.getByGame({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching game sessions/i)
  })

  test('getByStatus returns 200 with sessions with specific status', async ({ assert }) => {
    const service = {
      getByStatus: async () => [
        { id: 'session-1', status: 'en_cours' },
        { id: 'session-2', status: 'en_cours' },
      ],
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { status: 'en_cours' }

    await controller.getByStatus({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.length, 2)
    assert.match(response.body.message, /status: en_cours/i)
  })

  test('getByStatus returns 500 when service throws', async ({ assert }) => {
    const service = {
      getByStatus: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new GameSessionsController(service)

    const response = makeResponse()
    const params = { status: 'terminee' }

    await controller.getByStatus({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching game sessions/i)
  })
})