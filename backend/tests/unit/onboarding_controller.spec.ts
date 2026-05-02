import { test } from '@japa/runner'
import OnboardingController from '#controllers/onboarding_controller'
import { HttpContext } from '@adonisjs/core/http'
import { makeResponse } from '#tests/utils/http_helpers'

function makeCtx(overrides: Partial<HttpContext> = {}) {
  const response = makeResponse()
  const auth = { getUserOrFail: () => ({ id: 'user-1' }) } as any
  const request = {
    validateUsing: async () => ({ deezerArtistIds: [27, 413, 288166] }),
    qs: () => ({}),
  } as any

  return {
    response,
    ctx: { auth, request, response, ...overrides } as unknown as HttpContext,
  }
}

test.group('OnboardingController - Unit', () => {
  test('replace returns 500 when the service throws an unexpected error', async ({ assert }) => {
    const service = {
      replaceArtists: async () => {
        throw new Error('boom')
      },
    } as any
    const controller = new OnboardingController(service)
    const { response, ctx } = makeCtx()

    await controller.replace(ctx)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Failed to save onboarding artists')
  })
})
