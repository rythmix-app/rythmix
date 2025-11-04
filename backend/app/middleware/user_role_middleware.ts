import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class UserRoleMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn, options: { role: 'user' | 'admin' }) {
    const user = auth.user

    if (!user || user.role !== options.role) {
      return response.forbidden('Accès refusé')
    }

    await next()
  }
}
