import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { SpotifyService } from '#services/spotify_service'
import { deleteUserIntegrations } from '#tests/utils/user_integration_helpers'

test.group('MeIntegrationsController - Spotify status', (group) => {
  deleteUserIntegrations(group)

  test('GET /api/me/spotify/status returns 401 without auth', async ({ client }) => {
    const response = await client.get('/api/me/spotify/status')
    response.assertStatus(401)
  })

  test('GET /api/me/spotify/status returns connected=false for a fresh user', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('spotify_status_off')
    const response = await client.get('/api/me/spotify/status').bearerToken(token)
    response.assertStatus(200)
    response.assertBodyContains({ connected: false })
  })

  test('GET /api/me/spotify/status returns connected=true after linking', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser('spotify_status_on')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_linked',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-read-email',
    })

    const response = await client.get('/api/me/spotify/status').bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().connected, true)
    assert.equal(response.body().providerUserId, 'sp_linked')
    assert.equal(response.body().scopes, 'user-read-email')
  })
})

test.group('MeIntegrationsController - Unlink', (group) => {
  deleteUserIntegrations(group)

  test('DELETE /api/me/spotify returns 404 when no integration', async ({ client }) => {
    const { token } = await createAuthenticatedUser('spotify_unlink_missing')
    const response = await client.delete('/api/me/spotify').bearerToken(token)
    response.assertStatus(404)
  })

  test('DELETE /api/me/spotify removes the integration', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser('spotify_unlink_ok')
    const service = new SpotifyService()
    await service.upsertIntegration(user.id, {
      providerUserId: 'sp_unlink',
      accessToken: 'x',
    })

    const response = await client.delete('/api/me/spotify').bearerToken(token)
    response.assertStatus(200)

    assert.isNull(await service.findByUserId(user.id))
  })
})

test.group('MeIntegrationsController - Top tracks guards', (group) => {
  deleteUserIntegrations(group)

  test('GET /api/me/spotify/top-tracks returns 401 without auth', async ({ client }) => {
    const response = await client.get('/api/me/spotify/top-tracks')
    response.assertStatus(401)
  })

  test('GET /api/me/spotify/top-tracks returns 404 when no integration', async ({ client }) => {
    const { token } = await createAuthenticatedUser('spotify_tt_nolink')
    const response = await client.get('/api/me/spotify/top-tracks').bearerToken(token)
    response.assertStatus(404)
  })

  test('GET /api/me/spotify/top-tracks returns 422 for invalid timeRange', async ({ client }) => {
    const { token } = await createAuthenticatedUser('spotify_tt_bad')
    const response = await client
      .get('/api/me/spotify/top-tracks')
      .qs({ timeRange: 'nope' })
      .bearerToken(token)
    response.assertStatus(422)
  })
})

test.group('MeIntegrationsController - Spotify data fetch', (group) => {
  deleteUserIntegrations(group)
  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  async function linkUser(tag: string) {
    const ctx = await createAuthenticatedUser(tag)
    await new SpotifyService().upsertIntegration(ctx.user.id, {
      providerUserId: `sp_${tag}`,
      accessToken: 'valid',
      refreshToken: 'r',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      scopes: 'user-top-read',
    })
    return ctx
  }

  test('GET /top-tracks returns 200 with data for a linked user', async ({ client, assert }) => {
    const { token } = await linkUser('spotify_tt_ok')

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ items: [{ id: 'track_a', name: 'Track A' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client.get('/api/me/spotify/top-tracks').bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().items[0].id, 'track_a')
  })

  test('GET /top-artists returns 200 with data', async ({ client, assert }) => {
    const { token } = await linkUser('spotify_ta_ok')

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ items: [{ id: 'artist_a', name: 'Artist A' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client.get('/api/me/spotify/top-artists').bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().items[0].id, 'artist_a')
  })

  test('GET /recently-played returns 200 with data', async ({ client, assert }) => {
    const { token } = await linkUser('spotify_rp_ok')

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ items: [{ track: { id: 'recent_a' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client.get('/api/me/spotify/recently-played').bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().items[0].track.id, 'recent_a')
  })

  test('GET /top-tracks returns 401 when integration is expired and has no refresh token', async ({
    client,
  }) => {
    const { user, token } = await createAuthenticatedUser('spotify_tt_norefresh')
    await new SpotifyService().upsertIntegration(user.id, {
      providerUserId: 'sp_norefresh',
      accessToken: 'expired',
      refreshToken: null,
      expiresAt: DateTime.now().minus({ minutes: 5 }),
    })

    const response = await client.get('/api/me/spotify/top-tracks').bearerToken(token)
    response.assertStatus(401)
    response.assertBodyContains({ message: 'Spotify session expired, please reconnect' })
  })

  test('GET /top-tracks returns 500 on generic Spotify API error', async ({ client }) => {
    const { token } = await linkUser('spotify_tt_500')

    globalThis.fetch = async () =>
      new Response('{"error":{"status":500}}', {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client.get('/api/me/spotify/top-tracks').bearerToken(token)
    response.assertStatus(500)
    response.assertBodyContains({ message: 'Failed to fetch Spotify data' })
  })
})
