/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import db from '@adonisjs/lucid/services/db'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

router.get('/debug/user', async ({ request }) => {
  const userId = request.input('id')
  const result = await db.rawQuery(`select * from users where id = ${userId}`)

  return result.rows
})
