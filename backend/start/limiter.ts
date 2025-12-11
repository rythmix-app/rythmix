import limiter from '@adonisjs/limiter/services/main'
import env from '#start/env'

const isTest = env.get('NODE_ENV') === 'test'

export const throttle = limiter.define('global', () => {
  return limiter.allowRequests(isTest ? 10000 : 10).every('1 minute')
})

export const registerThrottle = limiter.define('auth:register', (ctx) => {
  return limiter
    .allowRequests(isTest ? 10000 : 5)
    .every('15 minutes')
    .usingKey(ctx.request.ip())
})

export const loginThrottle = limiter.define('auth:login', (ctx) => {
  return limiter
    .allowRequests(isTest ? 10000 : 10)
    .every('15 minutes')
    .usingKey(ctx.request.ip())
})

export const resendVerificationThrottle = limiter.define('auth:resend-verification', (ctx) => {
  return limiter
    .allowRequests(isTest ? 10000 : 3)
    .every('15 minutes')
    .usingKey(ctx.request.ip())
})
