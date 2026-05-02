import { test } from '@japa/runner'
import CuratedPlaylistsController from '#controllers/curated_playlists_controller'
import { CuratedPlaylistService } from '#services/curated_playlist_service'
import { HttpContext } from '@adonisjs/core/http'

const makeMockResponse = () => {
  return {
    statusCode: 0,
    body: null as unknown,
    okBody: null as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    ok(payload: unknown) {
      this.statusCode = 200
      this.okBody = payload
      this.body = payload
      return this
    },
    notFound(payload: unknown) {
      this.statusCode = 404
      this.body = payload
      return this
    },
    badRequest(payload: unknown) {
      this.statusCode = 400
      this.body = payload
      return this
    },
    internalServerError(payload: unknown) {
      this.statusCode = 500
      this.body = payload
      return this
    },
  }
}

test.group('CuratedPlaylistsController - Unit Tests for Edge Cases', () => {
  test('index returns 500 when the service throws', async ({ assert }) => {
    const service = new CuratedPlaylistService()
    const controller = new CuratedPlaylistsController(service)

    const original = service.listPlaylists
    service.listPlaylists = async () => {
      throw new Error('listing failed')
    }

    const mockResponse = makeMockResponse()
    const ctx = { response: mockResponse } as unknown as HttpContext

    try {
      await controller.index(ctx)
      assert.equal(mockResponse.statusCode, 500)
      assert.deepEqual(mockResponse.body, {
        message: 'Failed to fetch curated playlists',
      })
    } finally {
      service.listPlaylists = original
    }
  })

  test('tracks returns 400 when the playlist id is not numeric', async ({ assert }) => {
    const service = new CuratedPlaylistService()
    const controller = new CuratedPlaylistsController(service)

    const mockResponse = makeMockResponse()
    const ctx = {
      params: { id: 'not-a-number' },
      request: {
        qs: () => ({}),
        validateUsing: async () => ({ count: undefined }),
      },
      response: mockResponse,
    } as unknown as HttpContext

    await controller.tracks(ctx)
    assert.equal(mockResponse.statusCode, 400)
    assert.deepEqual(mockResponse.body, { message: 'Invalid playlist id' })
  })

  test('tracks rethrows unexpected errors', async ({ assert }) => {
    const service = new CuratedPlaylistService()
    const controller = new CuratedPlaylistsController(service)

    const original = service.getRandomTracks
    service.getRandomTracks = async () => {
      throw new Error('totally unexpected')
    }

    const mockResponse = makeMockResponse()
    const ctx = {
      params: { id: '42' },
      request: {
        qs: () => ({}),
        validateUsing: async () => ({ count: undefined }),
      },
      response: mockResponse,
    } as unknown as HttpContext

    try {
      await assert.rejects(async () => {
        await controller.tracks(ctx)
      }, /totally unexpected/)
    } finally {
      service.getRandomTracks = original
    }
  })
})
