import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class UserRoleMiddleware {
  async handle(
    { auth, response }: HttpContext,
    next: NextFn,
    options: { roles: ('user' | 'admin')[] }
  ) {
    const user = auth.user

    if (!user) {
      return response.unauthorized('Authentication required')
    }
    if (!options.roles.includes(user.role)) {
      return response.forbidden('Access refused')
    }

    await next()
  }
}
