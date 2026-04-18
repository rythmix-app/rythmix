import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import UserIntegration from '#models/user_integration'
import { SpotifyService } from '#services/spotify_service'
import { IntegrationProvider } from '#enums/integration_provider'
import { deleteUserIntegrations } from '#tests/utils/user_integration_helpers'

async function createUser(tag: string) {
  return User.create({
    username: `spot_${tag}_${Date.now()}_${Math.random()}`,
    email: `spot_${tag}_${Date.now()}_${Math.random()}@example.com`,
    password: 'password123',
  })
}

test.group('SpotifyService - Persistence', (group) => {
  deleteUserIntegrations(group)
  let service: SpotifyService

  group.each.setup(() => {
    service = new SpotifyService()
  })

  test('upsertIntegration creates a new integration with encrypted tokens', async ({ assert }) => {
    const user = await createUser('upsert_create')
    const integration = await service.upsertIntegration(user.id, {
      providerUserId: 'spotify_user_1',
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-read-email',
    })

    assert.instanceOf(integration, UserIntegration)
    assert.equal(integration.userId, user.id)
    assert.equal(integration.provider, IntegrationProvider.SPOTIFY)
    assert.equal(integration.accessToken, 'access-token-1')

    const row = await UserIntegration.query().where('id', integration.id).firstOrFail()
    assert.equal(row.accessToken, 'access-token-1')
    assert.equal(row.refreshToken, 'refresh-token-1')
  })

  test('upsertIntegration updates an existing integration and keeps old refresh token when absent', async ({
    assert,
  }) => {
    const user = await createUser('upsert_update')
    await service.upsertIntegration(user.id, {
      providerUserId: 'spotify_user_2',
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    const updated = await service.upsertIntegration(user.id, {
      providerUserId: 'spotify_user_2',
      accessToken: 'new-access',
      expiresAt: DateTime.now().plus({ hours: 2 }),
    })

    assert.equal(updated.accessToken, 'new-access')
    assert.equal(updated.refreshToken, 'old-refresh')

    const count = await UserIntegration.query().where('user_id', user.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 1)
  })

  test('unlink returns false when no integration exists', async ({ assert }) => {
    const user = await createUser('unlink_missing')
    const result = await service.unlink(user.id)
    assert.isFalse(result)
  })

  test('unlink deletes the integration and returns true', async ({ assert }) => {
    const user = await createUser('unlink_ok')
    await service.upsertIntegration(user.id, {
      providerUserId: 'sp_x',
      accessToken: 'x',
    })

    const result = await service.unlink(user.id)
    assert.isTrue(result)
    assert.isNull(await service.findByUserId(user.id))
  })
})

test.group('SpotifyService - Token refresh', (group) => {
  deleteUserIntegrations(group)
  let service: SpotifyService
  let originalFetch: typeof fetch

  group.each.setup(() => {
    service = new SpotifyService()
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('getValidAccessToken returns the stored token when not expired', async ({ assert }) => {
    const user = await createUser('valid_token')
    await service.upsertIntegration(user.id, {
      providerUserId: 'sp_valid',
      accessToken: 'still-good',
      refreshToken: 'r-1',
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    const calls: unknown[] = []
    globalThis.fetch = async (...args: unknown[]) => {
      calls.push(args)
      throw new Error('should not be called')
    }

    const token = await service.getValidAccessToken(user.id)
    assert.equal(token, 'still-good')
    assert.equal(calls.length, 0)
  })

  test('getValidAccessToken refreshes expired token and keeps old refresh_token when Spotify omits it', async ({
    assert,
  }) => {
    const user = await createUser('refresh_keep_old')
    await service.upsertIntegration(user.id, {
      providerUserId: 'sp_refresh',
      accessToken: 'expired',
      refreshToken: 'old-refresh',
      expiresAt: DateTime.now().minus({ minutes: 5 }),
    })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ access_token: 'fresh', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const token = await service.getValidAccessToken(user.id)
    assert.equal(token, 'fresh')

    const integration = await service.findByUserId(user.id)
    assert.equal(integration!.accessToken, 'fresh')
    assert.equal(integration!.refreshToken, 'old-refresh')
  })

  test('getValidAccessToken stores the new refresh_token when Spotify returns one', async ({
    assert,
  }) => {
    const user = await createUser('refresh_rotate')
    await service.upsertIntegration(user.id, {
      providerUserId: 'sp_rotate',
      accessToken: 'expired',
      refreshToken: 'old-refresh',
      expiresAt: DateTime.now().minus({ minutes: 5 }),
    })

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          access_token: 'fresh',
          refresh_token: 'rotated',
          expires_in: 3600,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    await service.getValidAccessToken(user.id)
    const integration = await service.findByUserId(user.id)
    assert.equal(integration!.refreshToken, 'rotated')
  })

  test('getValidAccessToken throws when no integration exists', async ({ assert }) => {
    const user = await createUser('no_integration')
    await assert.rejects(async () => {
      await service.getValidAccessToken(user.id)
    }, /not found/)
  })

  test('getValidAccessToken throws when expired and no refresh token stored', async ({
    assert,
  }) => {
    const user = await createUser('refresh_missing')
    await service.upsertIntegration(user.id, {
      providerUserId: 'sp_missing',
      accessToken: 'expired',
      refreshToken: null,
      expiresAt: DateTime.now().minus({ minutes: 5 }),
    })

    await assert.rejects(async () => {
      await service.getValidAccessToken(user.id)
    }, /refresh token missing/)
  })

  test('getValidAccessToken throws when Spotify refresh endpoint returns non-2xx', async ({
    assert,
  }) => {
    const user = await createUser('refresh_http_fail')
    await service.upsertIntegration(user.id, {
      providerUserId: 'sp_http_fail',
      accessToken: 'expired',
      refreshToken: 'r',
      expiresAt: DateTime.now().minus({ minutes: 5 }),
    })

    globalThis.fetch = async () =>
      new Response('{"error":"invalid_grant"}', {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })

    await assert.rejects(async () => {
      await service.getValidAccessToken(user.id)
    }, /token refresh failed: 400/)
  })
})

test.group('SpotifyService - API fetch', (group) => {
  deleteUserIntegrations(group)
  let service: SpotifyService
  let originalFetch: typeof fetch

  group.each.setup(() => {
    service = new SpotifyService()
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  async function createLinkedUser(tag: string) {
    const user = await createUser(tag)
    await service.upsertIntegration(user.id, {
      providerUserId: `sp_${tag}`,
      accessToken: 'valid-access',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })
    return user
  }

  test('getTopTracks hits the right URL with time_range and limit', async ({ assert }) => {
    const user = await createLinkedUser('tt_ok')
    let capturedUrl: string | null = null

    globalThis.fetch = async (input) => {
      capturedUrl = typeof input === 'string' ? input : (input as URL).toString()
      return new Response(JSON.stringify({ items: [{ id: 'track_1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = (await service.getTopTracks(user.id, {
      timeRange: 'short_term',
      limit: 5,
    })) as { items: { id: string }[] }

    assert.equal(data.items[0].id, 'track_1')
    assert.include(capturedUrl!, 'https://api.spotify.com/v1/me/top/tracks')
    assert.include(capturedUrl!, 'time_range=short_term')
    assert.include(capturedUrl!, 'limit=5')
  })

  test('getTopArtists uses medium_term and limit=20 by default', async ({ assert }) => {
    const user = await createLinkedUser('ta_defaults')
    let capturedUrl: string | null = null

    globalThis.fetch = async (input) => {
      capturedUrl = typeof input === 'string' ? input : (input as URL).toString()
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await service.getTopArtists(user.id)

    assert.include(capturedUrl!, '/me/top/artists')
    assert.include(capturedUrl!, 'time_range=medium_term')
    assert.include(capturedUrl!, 'limit=20')
  })

  test('getRecentlyPlayed uses default limit=20', async ({ assert }) => {
    const user = await createLinkedUser('rp_defaults')
    let capturedUrl: string | null = null

    globalThis.fetch = async (input) => {
      capturedUrl = typeof input === 'string' ? input : (input as URL).toString()
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await service.getRecentlyPlayed(user.id)

    assert.include(capturedUrl!, '/me/player/recently-played')
    assert.include(capturedUrl!, 'limit=20')
  })

  test('spotifyGet throws with status on Spotify API error', async ({ assert }) => {
    const user = await createLinkedUser('api_error')

    globalThis.fetch = async () =>
      new Response('{"error":{"status":401}}', {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })

    await assert.rejects(async () => {
      await service.getTopTracks(user.id)
    }, /Spotify API error 401/)
  })

  test('spotifyGet retries once on 429 respecting Retry-After and succeeds', async ({ assert }) => {
    const user = await createLinkedUser('rate_limited')
    let calls = 0
    const sleepCalls: number[] = []

    // Override sleep to avoid actual delay in tests
    ;(service as unknown as { sleep: (ms: number) => Promise<void> }).sleep = async (
      ms: number
    ) => {
      sleepCalls.push(ms)
    }

    globalThis.fetch = async () => {
      calls += 1
      if (calls === 1) {
        return new Response('{"error":{"status":429}}', {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
        })
      }
      return new Response(JSON.stringify({ items: [{ id: 'ok' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = (await service.getTopTracks(user.id)) as {
      items: { id: string }[]
    }
    assert.equal(calls, 2)
    assert.equal(data.items[0].id, 'ok')
    assert.deepEqual(sleepCalls, [1000])
  })

  test('spotifyGet gives up after exhausting 429 retries', async ({ assert }) => {
    const user = await createLinkedUser('rate_limited_exhaust')
    ;(service as unknown as { sleep: (ms: number) => Promise<void> }).sleep = async () => {}

    globalThis.fetch = async () =>
      new Response('{"error":{"status":429}}', {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })

    await assert.rejects(async () => {
      await service.getTopTracks(user.id)
    }, /rate limited/)
  })
})
