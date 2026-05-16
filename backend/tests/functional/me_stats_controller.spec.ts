import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { createAuthenticatedUser } from '#tests/utils/auth_helpers'
import { deleteGameSession } from '#tests/utils/game_session_helpers'
import { deleteTrackInteractions } from '#tests/utils/track_interaction_helpers'
import { MeStatsService } from '#services/me_stats_service'

test.group('MeStatsController', (group) => {
  deleteGameSession(group)
  deleteTrackInteractions(group)

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

  test('GET /api/me/stats forwards X-Timezone header to the service', async ({
    client,
    cleanup,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('ctrl_stats_tz')
    let receivedTimezone: string | undefined

    app.container.swap(MeStatsService, () => {
      return {
        getStats: async (_userId: string, timezone?: string) => {
          receivedTimezone = timezone
          return { totalSwipes: 0, gamesPlayed: 0, streak: 0 }
        },
      } as unknown as MeStatsService
    })
    cleanup(() => app.container.restore(MeStatsService))

    const response = await client
      .get('/api/me/stats')
      .header('X-Timezone', 'Europe/Paris')
      .bearerToken(token)

    response.assertStatus(200)
    assert.equal(receivedTimezone, 'Europe/Paris')
  })

  test('GET /api/me/stats falls back to UTC when X-Timezone is invalid', async ({
    client,
    cleanup,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('ctrl_stats_tz_bad')
    let receivedTimezone: string | undefined

    app.container.swap(MeStatsService, () => {
      return {
        getStats: async (_userId: string, timezone?: string) => {
          receivedTimezone = timezone
          return { totalSwipes: 0, gamesPlayed: 0, streak: 0 }
        },
      } as unknown as MeStatsService
    })
    cleanup(() => app.container.restore(MeStatsService))

    const response = await client
      .get('/api/me/stats')
      .header('X-Timezone', 'Not/A_Real_Zone')
      .bearerToken(token)

    response.assertStatus(200)
    assert.equal(receivedTimezone, 'UTC')
  })

  test('GET /api/me/stats returns 500 when service fails', async ({ client, cleanup }) => {
    const { token } = await createAuthenticatedUser('ctrl_stats_fail')

    app.container.swap(MeStatsService, () => {
      return {
        getStats: async () => {
          throw new Error('Service failure')
        },
      } as unknown as MeStatsService
    })
    cleanup(() => app.container.restore(MeStatsService))

    const response = await client.get('/api/me/stats').bearerToken(token)

    response.assertStatus(500)
    response.assertBodyContains({ message: 'Internal server error' })
  })
})
