import { test } from '@japa/runner'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteGameSession } from '#tests/utils/game_session_helpers'

test.group('MeStatsController', (group) => {
  deleteGameSession(group)

  test('GET /api/me/stats returns 200 and stats', async ({ client }) => {
    const { token } = await createAuthenticatedUser('ctrl_stats')

    const response = await client.get('/api/me/stats').bearerToken(token)

    response.assertStatus(200)

    response.assertBodyContains({
      data: {
        totalSwipes: 0,
        gamesPlayed: 0,
        streak: 0,
      },
    })
  })

  test('GET /api/me/stats returns 401 when not authenticated', async ({ client }) => {
    const response = await client.get('/api/me/stats')
    response.assertStatus(401)
  })
})
