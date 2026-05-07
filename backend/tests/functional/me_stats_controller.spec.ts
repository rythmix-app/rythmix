import { test } from '@japa/runner'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteGameSession } from '#tests/utils/game_session_helpers'
import { MeStatsService } from '#services/me_stats_service'

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

  test('GET /api/me/stats returns 500 when service fails', async ({ client }) => {
    const { token } = await createAuthenticatedUser('ctrl_stats_fail')

    // Force service failure
    const originalGetStats = MeStatsService.prototype.getStats
    MeStatsService.prototype.getStats = async () => {
      throw new Error('Service failure')
    }

    try {
      const response = await client.get('/api/me/stats').bearerToken(token)

      response.assertStatus(500)
      response.assertBodyContains({ message: 'Internal server error' })
    } finally {
      MeStatsService.prototype.getStats = originalGetStats
    }
  })
})
