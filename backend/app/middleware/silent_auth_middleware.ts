import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

/**
 * Silent auth middleware attempts to authenticate HTTP requests
 * but does not deny access if authentication fails.
 * This allows optional authentication where authenticated users
 * get additional features (e.g., isFavorite flag) but
 * unauthenticated users can still access the resource.
 */
export default class SilentAuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    try {
      await ctx.auth.authenticateUsing(options.guards || ['api'])
    } catch (error) {
      // Silently ignore authentication errors
      // User will be undefined in ctx.auth.user
    }
    return next()
  }
}
