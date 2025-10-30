/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

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
  })
  .prefix('/api')
