// TypeScript
// File: `backend/start/routes.ts`
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Root endpoint - API information
router.get('/', async ({ response }) => {
  return response.ok({
    name: 'Rythmix API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      users: '/api/users',
    },
  })
})

router
  .group(() => {
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
        router.get('/', '#controllers/liked_tracks_controller.index')
        router.post('/', '#controllers/liked_tracks_controller.create')
        router.get('/:id', '#controllers/liked_tracks_controller.show')
        router.patch('/:id', '#controllers/liked_tracks_controller.update')
        router.delete('/:id', '#controllers/liked_tracks_controller.delete')
      })
      .prefix('/liked-tracks')
  })
  .prefix('/api')
