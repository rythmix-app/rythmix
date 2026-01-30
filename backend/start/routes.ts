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
const FavoriteGamesController = () => import('#controllers/favorite_games_controller')

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
      favoriteGames: '/api/favorite-games',
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
        router.get('/', [UsersController, 'index']).use(middleware.role({ roles: ['admin'] }))
        router.post('/', [UsersController, 'create']).use(middleware.role({ roles: ['admin'] }))
        router
          .get('/trashed', [UsersController, 'trashed'])
          .use(middleware.role({ roles: ['admin'] }))
        router.get('/:id', [UsersController, 'show']).use(middleware.role({ roles: ['admin'] }))
        router.patch('/:id', [UsersController, 'update']).use(middleware.role({ roles: ['admin'] }))
        router
          .delete('/:id', [UsersController, 'delete'])
          .use(middleware.role({ roles: ['admin'] }))
        router
          .post('/:id/restore', [UsersController, 'restore'])
          .use(middleware.role({ roles: ['admin'] }))
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
        router.get('/', [GamesController, 'index']).use(middleware.silentAuth())
        router.post('/', [GamesController, 'create']).use(middleware.role({ roles: ['admin'] }))
        router.get('/:id', [GamesController, 'show']).use(middleware.silentAuth())
        router.patch('/:id', [GamesController, 'update']).use(middleware.role({ roles: ['admin'] }))
        router
          .delete('/:id', [GamesController, 'destroy'])
          .use(middleware.role({ roles: ['admin'] }))
      })
      .prefix('/games')
    router
      .group(() => {
        router.get('/', [GameSessionsController, 'index'])
        router.post('/', [GameSessionsController, 'create']).use(middleware.auth())
        router.get('/:id', [GameSessionsController, 'show'])
        router.get('/:gameId/sessions', [GameSessionsController, 'getByGame'])
        router.get('/status/:status', [GameSessionsController, 'getByStatus'])
        router.patch('/:id', [GameSessionsController, 'update']).use(middleware.auth())
        router.delete('/:id', [GameSessionsController, 'delete']).use(middleware.auth())
      })
      .prefix('/game-sessions')
    router
      .group(() => {
        router.get('/', [LikedTracksController, 'index'])
        router.post('/', [LikedTracksController, 'create']).use(middleware.auth())
        router.get('/:id', [LikedTracksController, 'show'])
        router.patch('/:id', [LikedTracksController, 'update']).use(middleware.auth())
        router.delete('/:id', [LikedTracksController, 'delete']).use(middleware.auth())
      })
      .prefix('/liked-tracks')
    router
      .group(() => {
        router
          .get('/', [FavoriteGamesController, 'index'])
          .use(middleware.role({ roles: ['admin'] }))
        router.get('/me', [FavoriteGamesController, 'myFavorites']).use(middleware.auth())
        router.post('/', [FavoriteGamesController, 'create']).use(middleware.auth())
        router.delete('/:id', [FavoriteGamesController, 'delete']).use(middleware.auth())
        router
          .delete('/game/:gameId', [FavoriteGamesController, 'deleteByGameId'])
          .use(middleware.auth())
      })
      .prefix('/favorite-games')
  })
  .prefix('/api')
