import { test } from '@japa/runner'
import MeIntegrationsController from '#controllers/me_integrations_controller'
import { HttpContext } from '@adonisjs/core/http'
import { makeResponse } from '#tests/utils/http_helpers'
import {
  SpotifyNotConnectedError,
  SpotifyScopeUpgradeRequiredError,
  SPOTIFY_ERROR_CODE,
} from '#services/spotify_playlist_service'

function makeCtx() {
  const response = makeResponse()
  const auth = { getUserOrFail: () => ({ id: 'user-1' }) } as any
  return {
    response,
    ctx: { auth, response } as unknown as HttpContext,
  }
}

test.group('MeIntegrationsController - syncLikedPlaylist', () => {
  test('returns 200 with the sync result on success', async ({ assert }) => {
    const playlist = {
      syncAllLikes: async () => ({ added: 3, notOnSpotify: 1, skipped: 0 }),
    } as any
    const controller = new MeIntegrationsController({} as any, playlist)
    const { response, ctx } = makeCtx()

    await controller.syncLikedPlaylist(ctx)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, { result: { added: 3, notOnSpotify: 1, skipped: 0 } })
  })

  test('returns 404 when integration is missing', async ({ assert }) => {
    const playlist = {
      syncAllLikes: async () => {
        throw new SpotifyNotConnectedError()
      },
    } as any
    const controller = new MeIntegrationsController({} as any, playlist)
    const { response, ctx } = makeCtx()

    await controller.syncLikedPlaylist(ctx)

    assert.equal(response.statusCode, 404)
    assert.equal(response.body.message, 'Spotify integration not found')
  })

  test('returns 403 with code when scope upgrade is required', async ({ assert }) => {
    const playlist = {
      syncAllLikes: async () => {
        throw new SpotifyScopeUpgradeRequiredError()
      },
    } as any
    const controller = new MeIntegrationsController({} as any, playlist)
    const { response, ctx } = makeCtx()

    await controller.syncLikedPlaylist(ctx)

    assert.equal(response.statusCode, 403)
    assert.equal(response.body.code, SPOTIFY_ERROR_CODE.ScopeUpgradeRequired)
  })

  test('returns 500 when an unexpected error is thrown', async ({ assert }) => {
    const playlist = {
      syncAllLikes: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new MeIntegrationsController({} as any, playlist)
    const { response, ctx } = makeCtx()

    await controller.syncLikedPlaylist(ctx)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Failed to sync Spotify playlist')
  })
})
