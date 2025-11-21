import limiter from '@adonisjs/limiter/services/main'

export const throttle = limiter.define('global', () => {
  return limiter.allowRequests(10).every('1 minute')
})

export const registerThrottle = limiter.define('auth:register', (ctx) => {
  return limiter.allowRequests(5).every('15 minutes').usingKey(ctx.request.ip())
})

export const loginThrottle = limiter.define('auth:login', (ctx) => {
  return limiter.allowRequests(10).every('15 minutes').usingKey(ctx.request.ip())
})

export const resendVerificationThrottle = limiter.define('auth:resend-verification', (ctx) => {
  return limiter.allowRequests(3).every('15 minutes').usingKey(ctx.request.ip())
})
