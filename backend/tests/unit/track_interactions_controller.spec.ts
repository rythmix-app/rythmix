import { test } from '@japa/runner'
import TrackInteractionsController from '#controllers/track_interactions_controller'
import { HttpContext } from '@adonisjs/core/http'
import { makeResponse } from '#tests/utils/http_helpers'
import { SpotifyScopeUpgradeRequiredError } from '#services/spotify_playlist_service'

function makeCtx(overrides: Partial<HttpContext> = {}) {
  const response = makeResponse()
  const auth = { getUserOrFail: () => ({ id: 'user-1' }) } as any
  const request = {
    validateUsing: async () => ({
      deezerTrackId: '1',
      action: 'liked',
    }),
    qs: () => ({}),
  } as any

  return {
    response,
    ctx: { auth, request, response, ...overrides } as unknown as HttpContext,
  }
}

test.group('TrackInteractionsController - Unit', () => {
  test('index returns 500 when the service throws an unexpected error', async ({ assert }) => {
    const service = {
      getByUserId: () => {
        throw new Error('boom')
      },
    } as any
    const controller = new TrackInteractionsController(
      service,
      { findByUserId: async () => null } as any,
      {} as any
    )
    const { response, ctx } = makeCtx()

    await controller.index(ctx)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Error while fetching track interactions')
  })

  test('upsert forwards the service error status and message when service returns ServiceError', async ({
    assert,
  }) => {
    const service = {
      upsertInteraction: async () => ({
        error: 'One or more fields exceed maximum length',
        status: 400,
      }),
    } as any
    const controller = new TrackInteractionsController(
      service,
      { findByUserId: async () => null } as any,
      {} as any
    )
    const { response, ctx } = makeCtx()

    await controller.upsert(ctx)

    assert.equal(response.statusCode, 400)
    assert.equal(response.body.message, 'One or more fields exceed maximum length')
  })

  test('upsert returns 500 when the service throws an unexpected error', async ({ assert }) => {
    const service = {
      upsertInteraction: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new TrackInteractionsController(
      service,
      { findByUserId: async () => null } as any,
      {} as any
    )
    const { response, ctx } = makeCtx()

    await controller.upsert(ctx)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Error while upserting track interaction')
  })

  test('delete returns 500 when the service throws an unexpected error', async ({ assert }) => {
    const service = {
      deleteInteraction: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new TrackInteractionsController(
      service,
      { findByUserId: async () => null } as any,
      {} as any
    )
    const { response, ctx } = makeCtx({ params: { deezerTrackId: '1' } } as any)

    await controller.delete(ctx)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Error while deleting track interaction')
  })

  test('delete forwards the service error status and message when interaction is missing', async ({
    assert,
  }) => {
    const service = {
      deleteInteraction: async () => ({
        error: 'Track interaction not found',
        status: 404,
      }),
    } as any
    const controller = new TrackInteractionsController(
      service,
      { findByUserId: async () => null } as any,
      {} as any
    )
    const { response, ctx } = makeCtx({ params: { deezerTrackId: '1' } } as any)

    await controller.delete(ctx)

    assert.equal(response.statusCode, 404)
    assert.equal(response.body.message, 'Track interaction not found')
  })

  test('upsert returns spotifyResult with added flag when integration is linked and addTrack succeeds', async ({
    assert,
  }) => {
    const service = {
      upsertInteraction: async () => ({ id: 1, action: 'liked' }),
    } as any
    const spotifyService = { findByUserId: async () => ({ id: 'i' }) } as any
    const playlist = {
      addTrack: async () => ({ added: true, notOnSpotify: false }),
    } as any
    const controller = new TrackInteractionsController(service, spotifyService, playlist)
    const { response, ctx } = makeCtx()

    await controller.upsert(ctx)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body.spotifyResult, {
      triggered: true,
      added: true,
      notOnSpotify: false,
    })
  })

  test('upsert returns scopeUpgradeRequired when the playlist service throws scope upgrade', async ({
    assert,
  }) => {
    const service = {
      upsertInteraction: async () => ({ id: 1, action: 'liked' }),
    } as any
    const spotifyService = { findByUserId: async () => ({ id: 'i' }) } as any
    const playlist = {
      addTrack: async () => {
        throw new SpotifyScopeUpgradeRequiredError()
      },
    } as any
    const controller = new TrackInteractionsController(service, spotifyService, playlist)
    const { response, ctx } = makeCtx()

    await controller.upsert(ctx)

    assert.deepEqual(response.body.spotifyResult, {
      triggered: false,
      scopeUpgradeRequired: true,
    })
  })

  test('upsert returns triggered:false when the playlist service throws an unexpected error', async ({
    assert,
  }) => {
    const service = {
      upsertInteraction: async () => ({ id: 1, action: 'liked' }),
    } as any
    const spotifyService = { findByUserId: async () => ({ id: 'i' }) } as any
    const playlist = {
      addTrack: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new TrackInteractionsController(service, spotifyService, playlist)
    const { response, ctx } = makeCtx()

    await controller.upsert(ctx)

    assert.deepEqual(response.body.spotifyResult, { triggered: false })
  })

  test('delete returns spotifyResult.removed when integration is linked', async ({ assert }) => {
    const service = {
      deleteInteraction: async () => ({ message: 'ok' }),
    } as any
    const spotifyService = { findByUserId: async () => ({ id: 'i' }) } as any
    const playlist = {
      removeTrack: async () => ({ removed: true }),
    } as any
    const controller = new TrackInteractionsController(service, spotifyService, playlist)
    const { response, ctx } = makeCtx({ params: { deezerTrackId: '1' } } as any)

    await controller.delete(ctx)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body.spotifyResult, { triggered: true, removed: true })
  })
})
