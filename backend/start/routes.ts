import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import { loginThrottle, registerThrottle, resendVerificationThrottle } from './limiter.js'

router.get('/', async ({ response }) => {
  return response.ok({
    name: 'Rythmix API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      achievements: '/api/achievements',
      games: '/api/games',
      likedTracks: '/api/liked-tracks',
      gameSessions: '/api/game-sessions',
    },
  })
})

router
  .group(() => {
    router
      .group(() => {
        router.post('/register', '#controllers/auth_controller.register').use(registerThrottle)
        router.post('/login', '#controllers/auth_controller.login').use(loginThrottle)
        router.post('/refresh', '#controllers/auth_controller.refresh')
        router.post('/logout', '#controllers/auth_controller.logout').use(middleware.auth())
        router.get('/verify-email', '#controllers/auth_controller.verifyEmail')
        router
          .post('/resend-verification', '#controllers/auth_controller.resendVerificationEmail')
          .use(resendVerificationThrottle)
        router.get('/me', '#controllers/auth_controller.me').use(middleware.auth())
      })
      .prefix('/auth')

    router
      .group(() => {
        router.get('/', '#controllers/users_controller.index')
        router.post('/', '#controllers/users_controller.create')
        router.get('/trashed', '#controllers/users_controller.trashed')
        router.get('/:id', '#controllers/users_controller.show')
        router.patch('/:id', '#controllers/users_controller.update')
        router.delete('/:id', '#controllers/users_controller.delete').use(middleware.auth())
        router.post('/:id/restore', '#controllers/users_controller.restore')
      })
      .prefix('/users')
    router
      .group(() => {
        router.get('/', '#controllers/achievements_controller.index')
        router.post('/', '#controllers/achievements_controller.create')
        router.get('/:id', '#controllers/achievements_controller.show')
        router.patch('/:id', '#controllers/achievements_controller.update')
        router.delete('/:id', '#controllers/achievements_controller.delete')
      })
      .prefix('/achievements')
    router
      .group(() => {
        router.get('/', '#controllers/games_controller.index')
        router
          .post('/', '#controllers/games_controller.create')
          .use(middleware.role({ roles: ['admin'] }))
        router.get('/:id', '#controllers/games_controller.show')
        router
          .patch('/:id', '#controllers/games_controller.update')
          .use(middleware.role({ roles: ['admin'] }))
        router
          .delete('/:id', '#controllers/games_controller.destroy')
          .use(middleware.role({ roles: ['admin'] }))
      })
      .prefix('/games')
    router
      .group(() => {
        router.get('/', '#controllers/game_sessions_controller.index')
        router.post('/', '#controllers/game_sessions_controller.create')
        router.get('/status/:status', '#controllers/game_sessions_controller.getByStatus')
        router.get('/:id', '#controllers/game_sessions_controller.show')
        router.patch('/:id', '#controllers/game_sessions_controller.update')
        router.delete('/:id', '#controllers/game_sessions_controller.delete')
      })
      .prefix('/game-sessions')
    router
      .group(() => {
        router.get('/:gameId/sessions', '#controllers/game_sessions_controller.getByGame')
      })
      .prefix('/games')
    router
      .group(() => {
        router.get('/', '#controllers/liked_tracks_controller.index')
        router.post('/', '#controllers/liked_tracks_controller.create')
        router.get('/:id', '#controllers/liked_tracks_controller.show')
        router.patch('/:id', '#controllers/liked_tracks_controller.update')
        router.delete('/:id', '#controllers/liked_tracks_controller.delete')
      })
      .prefix('/liked-tracks')
  })
  .prefix('/api')