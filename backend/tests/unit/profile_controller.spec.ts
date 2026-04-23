import { test } from '@japa/runner'
import ProfileController from '#controllers/profile_controller'
import { HttpContext } from '@adonisjs/core/http'
import { makeResponse } from '#tests/utils/http_helpers'

test.group('ProfileController - Unit', () => {
  test('update falls back to 500 when service returns error without status', async ({ assert }) => {
    const userService = {
      updateUser: async () => ({ error: 'Unexpected failure' }),
    } as any
    const controller = new ProfileController(userService)

    const response = makeResponse()
    const request = { only: () => ({ firstName: 'X' }) } as any
    const auth = { getUserOrFail: () => ({ id: 'user-1' }) } as any

    await controller.update({ auth, request, response } as any as HttpContext)

    assert.equal(response.statusCode, 500)
    assert.equal(response.body.message, 'Unexpected failure')
  })
})
