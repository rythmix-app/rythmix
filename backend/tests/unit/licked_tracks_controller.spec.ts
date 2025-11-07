import { test } from '@japa/runner'
import LickedTracksController from '#controllers/licked_tracks_controller'
import LickedTrack from '#models/licked_track'
import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'

async function createTestUser(tag: string) {
  return await User.create({
    username: `test_${tag}_${Date.now()}`,
    email: `test_${tag}_${Date.now()}@example.com`,
    password: 'password123',
  })
}

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

test.group('LickedTracksController - Unit', () => {
  test('index returns 200 with data on success', async ({ assert }) => {
    const service = { getAll: async () => [{ id: 1 }, { id: 2 }] } as any
    const controller = new LickedTracksController(service)
    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body.data, [{ id: 1 }, { id: 2 }])
  })

  test('index returns 500 when service throws', async ({ assert }) => {
    const service = {
      getAll: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new LickedTracksController(service)
    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching licked tracks/i)
  })

  test('create returns 201 when service returns model', async ({ assert }) => {
    const user = await createTestUser('create_ok')
    const model = new LickedTrack()
    model.userId = user.id
    ;(model as any).id = 123

    const service = { createLickedTrack: async () => model } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ userId: user.id, spotifyId: 'sp' }) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 201)
    assert.equal(response.body.data.userId, user.id)
    assert.equal(response.body.message, 'Licked track created')
  })

  test('create returns mapped status when service returns error object', async ({ assert }) => {
    const service = {
      createLickedTrack: async () => ({
        error: 'Conflict when creating licked track',
        status: 409,
      }),
    } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ userId: 'x' }) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 409)
    assert.match(response.body.message, /Conflict/i)
  })

  test('create returns 500 when service throws', async ({ assert }) => {
    const service = {
      createLickedTrack: async () => {
        throw new Error('db down')
      },
    } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({}) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while creating licked track/i)
  })

  test('show returns 200 with model when found', async ({ assert }) => {
    const service = { getById: async () => ({ id: 77 }) } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const params = { id: 77 }

    await controller.show({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.id, 77)
  })

  test('show returns 404 when not found', async ({ assert }) => {
    const service = { getById: async () => null } as any
    const controller = new LickedTracksController(service)

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
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const params = { id: 1 }

    await controller.show({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while fetching licked track/i)
  })

  test('update returns 200 with model on success', async ({ assert }) => {
    const user = await createTestUser('upd_ok')
    const model = new LickedTrack()
    model.userId = user.id
    ;(model as any).id = 5
    ;(model as any).title = 'New'

    const service = { updateLickedTrack: async () => model } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ title: 'New' }) } as any
    const params = { id: 5 }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.title, 'New')
  })

  test('update returns mapped status when service returns error object', async ({ assert }) => {
    const service = {
      updateLickedTrack: async () => ({ error: 'LickedTrack not found', status: 404 }),
    } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ title: 'x' }) } as any
    const params = { id: 1 }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 404)
    assert.match(response.body.message, /not found/i)
  })

  test('update returns 500 when service throws', async ({ assert }) => {
    const service = {
      updateLickedTrack: async () => {
        throw new Error('oops')
      },
    } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({ title: 'x' }) } as any
    const params = { id: 1 }

    await controller.update({ response, request, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while updating licked track/i)
  })

  test('delete returns 200 with message on success', async ({ assert }) => {
    const service = { deleteLickedTrack: async () => ({ message: 'ok' }) } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const params = { id: 10 }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.message, 'ok')
  })

  test('delete returns mapped status when service returns error object', async ({ assert }) => {
    const service = {
      deleteLickedTrack: async () => ({ error: 'LickedTrack not found', status: 404 }),
    } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const params = { id: 11 }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 404)
    assert.match(response.body.message, /not found/i)
  })

  test('delete returns 500 when service throws', async ({ assert }) => {
    const service = {
      deleteLickedTrack: async () => {
        throw new Error('oops')
      },
    } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const params = { id: 12 }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Error while deleting licked track/i)
  })
  test('create returns 500 when service returns error object without status', async ({
    assert,
  }) => {
    const service = {
      createLickedTrack: async () => ({ error: 'Some error without status' }),
    } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const request = { only: () => ({}) } as any

    await controller.create({ request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Some error|Error/i)
  })
  test('update returns 500 when service returns error object without status', async ({
    assert,
  }) => {
    const service = { updateLickedTrack: async () => ({ error: 'Update failed' }) } as any
    const controller = new LickedTracksController(service)

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
    const service = { deleteLickedTrack: async () => ({ error: 'Delete failed' }) } as any
    const controller = new LickedTracksController(service)

    const response = makeResponse()
    const params = { id: 1 }

    await controller.delete({ response, params } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.match(response.body.message, /Delete failed|Error/i)
  })
  test('index returns 200 with empty list', async ({ assert }) => {
    const service = { getAll: async () => [] } as any
    const controller = new LickedTracksController(service)
    const response = makeResponse()

    await controller.index({ response } as any as HttpContext)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body.data, [])
  })
})
