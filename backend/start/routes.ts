import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import { loginThrottle, registerThrottle, resendVerificationThrottle } from './limiter.js'
import openapi from '@foadonis/openapi/services/main'

// Controller imports for OpenAPI support
const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')
const GamesController = () => import('#controllers/games_controller')
const AchievementsController = () => import('#controllers/achievements_controller')
const GameSessionsController = () => import('#controllers/game_sessions_controller')
const LikedTracksController = () => import('#controllers/liked_tracks_controller')

// Register OpenAPI/Swagger routes: /docs, /docs.json, /docs.yaml
openapi.registerRoutes('/docs')

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
      docs: '/docs',
    },
  })
})

router
  .group(() => {
    router
      .group(() => {
        router.post('/register', [AuthController, 'register']).use(registerThrottle)
        router.post('/login', [AuthController, 'login']).use(loginThrottle)
        router.post('/refresh', [AuthController, 'refresh'])
        router.post('/logout', [AuthController, 'logout']).use(middleware.auth())
        router.get('/verify-email', [AuthController, 'verifyEmail'])
        router.post('/verify-email', [AuthController, 'verifyEmail'])
        router
          .post('/resend-verification', [AuthController, 'resendVerificationEmail'])
          .use(resendVerificationThrottle)
        router.get('/me', [AuthController, 'me']).use(middleware.auth())
      })
      .prefix('/auth')

    router
      .group(() => {
        router.get('/', [UsersController, 'index'])
        router.post('/', [UsersController, 'create'])
        router.get('/trashed', [UsersController, 'trashed'])
        router.get('/:id', [UsersController, 'show'])
        router.patch('/:id', [UsersController, 'update'])
        router.delete('/:id', [UsersController, 'delete']).use(middleware.auth())
        router.post('/:id/restore', [UsersController, 'restore'])
      })
      .prefix('/users')
    router
      .group(() => {
        router.get('/', [AchievementsController, 'index'])
        router.post('/', [AchievementsController, 'create'])
        router.get('/:id', [AchievementsController, 'show'])
        router.patch('/:id', [AchievementsController, 'update'])
        router.delete('/:id', [AchievementsController, 'delete'])
      })
      .prefix('/achievements')
    router
      .group(() => {
        router.get('/', [GamesController, 'index'])
        router.post('/', [GamesController, 'create']).use(middleware.role({ roles: ['admin'] }))
        router.get('/:id', [GamesController, 'show'])
        router.patch('/:id', [GamesController, 'update']).use(middleware.role({ roles: ['admin'] }))
        router
          .delete('/:id', [GamesController, 'destroy'])
          .use(middleware.role({ roles: ['admin'] }))
      })
      .prefix('/games')
    router
      .group(() => {
        router.get('/', [GameSessionsController, 'index'])
        router.post('/', [GameSessionsController, 'create'])
        router.get('/status/:status', [GameSessionsController, 'getByStatus'])
        router.get('/:id', [GameSessionsController, 'show'])
        router.patch('/:id', [GameSessionsController, 'update'])
        router.delete('/:id', [GameSessionsController, 'delete'])
      })
      .prefix('/game-sessions')
    router
      .group(() => {
        router.get('/:gameId/sessions', [GameSessionsController, 'getByGame'])
      })
      .prefix('/games')
    router
      .group(() => {
        router.get('/', [LikedTracksController, 'index'])
        router.post('/', [LikedTracksController, 'create'])
        router.get('/:id', [LikedTracksController, 'show'])
        router.patch('/:id', [LikedTracksController, 'update'])
        router.delete('/:id', [LikedTracksController, 'delete'])
      })
      .prefix('/liked-tracks')
  })
  .prefix('/api')
