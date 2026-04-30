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
const TrackInteractionsController = () => import('#controllers/track_interactions_controller')
const FavoriteGamesController = () => import('#controllers/favorite_games_controller')
const UserAchievementsController = () => import('#controllers/user_achievements_controller')
const ProfileController = () => import('#controllers/profile_controller')
const SpotifyAuthController = () => import('#controllers/spotify_auth_controller')
const GoogleAuthController = () => import('#controllers/google_auth_controller')
const MeIntegrationsController = () => import('#controllers/me_integrations_controller')
const CuratedPlaylistsController = () => import('#controllers/curated_playlists_controller')

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
      trackInteractions: '/api/me/swipemix/interactions',
      favoriteGames: '/api/favorite-games',
      userAchievements: '/api/user-achievements',
      gameSessions: '/api/game-sessions',
      profile: '/api/profile',
      me: '/api/me',
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
        router.post('/spotify/init', [SpotifyAuthController, 'init']).use(middleware.auth())
        router.get('/spotify/callback', [SpotifyAuthController, 'callback'])
        router.get('/google/redirect', [GoogleAuthController, 'redirect'])
        router.get('/google/callback', [GoogleAuthController, 'callback'])
      })
      .prefix('/auth')

    router
      .group(() => {
        router.get('/spotify/status', [MeIntegrationsController, 'spotifyStatus'])
        router.get('/spotify/top-tracks', [MeIntegrationsController, 'topTracks'])
        router.get('/spotify/top-artists', [MeIntegrationsController, 'topArtists'])
        router.get('/spotify/recently-played', [MeIntegrationsController, 'recentlyPlayed'])
        router.delete('/spotify', [MeIntegrationsController, 'unlinkSpotify'])

        router.get('/swipemix/interactions', [TrackInteractionsController, 'index'])
        router.post('/swipemix/interactions', [TrackInteractionsController, 'upsert'])
        router.delete('/swipemix/interactions/:deezerTrackId', [
          TrackInteractionsController,
          'delete',
        ])
      })
      .prefix('/me')
      .use(middleware.auth())

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
        router.get('/', [ProfileController, 'show']).use(middleware.auth())
        router.patch('/', [ProfileController, 'update']).use(middleware.auth())
      })
      .prefix('/profile')
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
        router
          .get('/blindtest/playlists', [CuratedPlaylistsController, 'index'])
          .use(middleware.auth())
        router
          .get('/blindtest/playlists/:id/tracks', [CuratedPlaylistsController, 'tracks'])
          .use(middleware.auth())
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
        router.get('/me', [GameSessionsController, 'mySessions']).use(middleware.auth())
        router
          .get('/me/game/:gameId', [GameSessionsController, 'myGameHistory'])
          .use(middleware.auth())
        router
          .get('/me/game/:gameId/stats', [GameSessionsController, 'myGameStats'])
          .use(middleware.auth())
        router
          .get('/me/game/:gameId/active', [GameSessionsController, 'myActiveSession'])
          .use(middleware.auth())
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
    router
      .group(() => {
        router
          .get('/', [UserAchievementsController, 'index'])
          .use(middleware.role({ roles: ['admin'] }))
        router.get('/me', [UserAchievementsController, 'myAchievements']).use(middleware.auth())
        router.get('/stats', [UserAchievementsController, 'stats']).use(middleware.auth())
        router.post('/', [UserAchievementsController, 'create']).use(middleware.auth())
        router
          .patch('/:id/progress', [UserAchievementsController, 'updateProgress'])
          .use(middleware.auth())
        router
          .patch('/:id/reset', [UserAchievementsController, 'reset'])
          .use(middleware.role({ roles: ['admin'] }))
        router.delete('/:id', [UserAchievementsController, 'delete']).use(middleware.auth())
      })
      .prefix('/user-achievements')
  })
  .prefix('/api')
