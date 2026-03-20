import { test } from '@japa/runner'
import LikedTracksController from '#controllers/liked_tracks_controller'
import LikedTrack from '#models/liked_track'
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

test.group('LikedTracksController - Unit', () => {
  test('index returns 200 with data on success', async ({ assert }) => {
    const service = { getAll: async () => [{ id: 1 }, { id: 2 }] } as any
    const controller = new LikedTracksController(service)
    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body.likedTracks, [{ id: 1 }, { id: 2 }])
  })

  test('index returns 500 when service throws', async ({ assert }) => {
    const service = {
      getAll: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new LikedTracksController(service)
    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching liked tracks/i)
  })

  test('myLikedTracks returns 200 with user liked tracks', async ({ assert }) => {
    const service = { getByUserId: async () => [{ id: 1 }, { id: 2 }] } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const auth = { user: { id: 'user-1' } } as any

    await controller.myLikedTracks({ auth, response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body.likedTracks, [{ id: 1 }, { id: 2 }])
  })

  test('myLikedTracks returns 500 when service throws', async ({ assert }) => {
    const service = {
      getByUserId: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const auth = { user: { id: 'user-1' } } as any

    await controller.myLikedTracks({ auth, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching user liked tracks/i)
  })

  test('create returns 201 when service returns model', async ({ assert }) => {
    const model = new LikedTrack()
    model.userId = '1'
    ;(model as any).id = 123

    const service = { createLikedTrack: async () => model } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ userId: 1, deezerTrackId: 'sp' }) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 201)
    assert.equal(response.body.likedTrack.userId, 1)
  })

  test('create returns mapped status when service returns error object', async ({ assert }) => {
    const service = {
      createLikedTrack: async () => ({
        error: 'Conflict when creating liked track',
        status: 409,
      }),
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ userId: 'x' }) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 409)
    assert.match(response.body.message, /Conflict/i)
  })

  test('create returns 500 when service throws', async ({ assert }) => {
    const service = {
      createLikedTrack: async () => {
        throw new Error('db down')
      },
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({}) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while creating liked track/i)
  })

  test('createMyLikedTrack returns 201 when service returns model', async ({ assert }) => {
    const model = new LikedTrack()
    model.userId = 'user-1'
    ;(model as any).id = 321

    const service = { createLikedTrack: async () => model } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ deezerTrackId: 'sp' }) } as any
    const auth = { user: { id: 'user-1' } } as any

    await controller.createMyLikedTrack({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 201)
    assert.equal(response.body.likedTrack.userId, 'user-1')
  })

  test('createMyLikedTrack returns mapped status when service returns error object', async ({
    assert,
  }) => {
    const service = {
      createLikedTrack: async () => ({
        error: 'Conflict when creating liked track',
        status: 409,
      }),
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ deezerTrackId: 'sp' }) } as any
    const auth = { user: { id: 'user-1' } } as any

    await controller.createMyLikedTrack({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 409)
    assert.match(response.body.message, /Conflict/i)
  })

  test('createMyLikedTrack returns 500 when service throws', async ({ assert }) => {
    const service = {
      createLikedTrack: async () => {
        throw new Error('db down')
      },
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ deezerTrackId: 'sp' }) } as any
    const auth = { user: { id: 'user-1' } } as any

    await controller.createMyLikedTrack({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while creating liked track/i)
  })

  test('deleteMyLikedTrack returns 200 on success', async ({ assert }) => {
    const service = {
      deleteMyLikedTrack: async () => ({ message: 'ok' }),
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ deezerTrackId: 'track_1' }) } as any
    const auth = { user: { id: 'user-1' } } as any

    await controller.deleteMyLikedTrack({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.message, 'ok')
  })

  test('deleteMyLikedTrack returns 400 when deezerTrackId missing', async ({ assert }) => {
    const service = {
      deleteMyLikedTrack: async () => ({ message: 'ok' }),
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({}) } as any
    const auth = { user: { id: 'user-1' } } as any

    await controller.deleteMyLikedTrack({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 400)
    assert.match(response.body.message, /required/i)
  })

  test('deleteMyLikedTrack returns mapped status when service returns error object', async ({
    assert,
  }) => {
    const service = {
      deleteMyLikedTrack: async () => ({ error: 'LikedTrack not found', status: 404 }),
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ deezerTrackId: 'track_1' }) } as any
    const auth = { user: { id: 'user-1' } } as any

    await controller.deleteMyLikedTrack({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 404)
    assert.match(response.body.message, /not found/i)
  })

  test('deleteMyLikedTrack returns 500 when service throws', async ({ assert }) => {
    const service = {
      deleteMyLikedTrack: async () => {
        throw new Error('oops')
      },
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ deezerTrackId: 'track_1' }) } as any
    const auth = { user: { id: 'user-1' } } as any

    await controller.deleteMyLikedTrack({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while deleting liked track/i)
  })

  test('show returns 200 with model when found', async ({ assert }) => {
    const service = { getById: async () => ({ id: 77 }) } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const params = { id: 77 }

    await controller.show({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.likedTrack.id, 77)
  })

  test('show returns 404 when not found', async ({ assert }) => {
    const service = { getById: async () => null } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const params = { id: 999 }

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
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const params = { id: 1 }

    await controller.show({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching liked track/i)
  })

  test('update returns 200 with model on success', async ({ assert }) => {
    const model = new LikedTrack()
    model.userId = '1'
    ;(model as any).id = 5
    ;(model as any).title = 'New'

    const service = { updateLikedTrack: async () => model } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ title: 'New' }) } as any
    const params = { id: 5 }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.likedTrack.title, 'New')
  })

  test('update returns mapped status when service returns error object', async ({ assert }) => {
    const service = {
      updateLikedTrack: async () => ({ error: 'LikedTrack not found', status: 404 }),
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ title: 'x' }) } as any
    const params = { id: 1 }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 404)
    assert.match(response.body.message, /not found/i)
  })

  test('update returns 500 when service throws', async ({ assert }) => {
    const service = {
      updateLikedTrack: async () => {
        throw new Error('oops')
      },
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ title: 'x' }) } as any
    const params = { id: 1 }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while updating liked track/i)
  })

  test('delete returns 200 with message on success', async ({ assert }) => {
    const service = { deleteLikedTrack: async () => ({ message: 'ok' }) } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const params = { id: 10 }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.message, 'ok')
  })

  test('delete returns mapped status when service returns error object', async ({ assert }) => {
    const service = {
      deleteLikedTrack: async () => ({ error: 'LikedTrack not found', status: 404 }),
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const params = { id: 11 }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 404)
    assert.match(response.body.message, /not found/i)
  })

  test('delete returns 500 when service throws', async ({ assert }) => {
    const service = {
      deleteLikedTrack: async () => {
        throw new Error('oops')
      },
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const params = { id: 12 }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while deleting liked track/i)
  })
  test('create returns 500 when service returns error object without status', async ({
    assert,
  }) => {
    const service = {
      createLikedTrack: async () => ({ error: 'Some error without status' }),
    } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({}) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Some error|Error/i)
  })
  test('update returns 500 when service returns error object without status', async ({
    assert,
  }) => {
    const service = { updateLikedTrack: async () => ({ error: 'Update failed' }) } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ title: 'x' }) } as any
    const params = { id: 1 }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Update failed|Error/i)
  })
  test('delete returns 500 when service returns error object without status', async ({
    assert,
  }) => {
    const service = { deleteLikedTrack: async () => ({ error: 'Delete failed' }) } as any
    const controller = new LikedTracksController(service)

    const response = makeResponse()
    const params = { id: 1 }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Delete failed|Error/i)
  })
  test('index returns 200 with empty list', async ({ assert }) => {
    const service = { getAll: async () => [] } as any
    const controller = new LikedTracksController(service)
    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body.likedTracks, [])
  })
})
