import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import { SpotifyService } from '#services/spotify_service'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteUserIntegrations } from '#tests/utils/user_integration_helpers'

const makeUser = (prefix: string) => {
  const timestamp = Date.now() + Math.random()
  return {
    username: `${prefix}_${timestamp}`,
    email: `${prefix}_${timestamp}@example.com`,
    password: 'password123',
  }
}

async function linkSpotify(userId: string, providerUserId: string) {
  await new SpotifyService().upsertIntegration(userId, {
    providerUserId,
    accessToken: 'valid',
    refreshToken: 'r',
    expiresAt: DateTime.now().plus({ hours: 1 }),
    scopes: 'user-top-read',
  })
}

test.group('AdminUserIntegrationsController - hasSpotify on /api/users', (group) => {
  deleteUserIntegrations(group)

  test('GET /api/users exposes hasSpotify=false when no integration', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin_hs_off', 'admin')
    const target = await User.create(makeUser('hs_off_target'))

    const response = await client.get('/api/users').bearerToken(token)
    response.assertStatus(200)

    const found = response.body().users.find((u: { id: string }) => u.id === target.id)
    assert.exists(found)
    assert.equal(found.hasSpotify, false)
  })

  test('GET /api/users exposes hasSpotify=true after linking', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin_hs_on', 'admin')
    const target = await User.create(makeUser('hs_on_target'))
    await linkSpotify(target.id, 'sp_admin_hs_on')

    const response = await client.get('/api/users').bearerToken(token)
    response.assertStatus(200)

    const found = response.body().users.find((u: { id: string }) => u.id === target.id)
    assert.equal(found.hasSpotify, true)
  })

  test('GET /api/users/:id exposes hasSpotify on the single user response', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('admin_hs_show', 'admin')
    const target = await User.create(makeUser('hs_show_target'))
    await linkSpotify(target.id, 'sp_admin_hs_show')

    const response = await client.get(`/api/users/${target.id}`).bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().user.hasSpotify, true)
  })

  test('GET /api/users/trashed exposes hasSpotify on trashed users', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin_hs_trashed', 'admin')
    const target = await User.create(makeUser('hs_trashed_target'))
    await linkSpotify(target.id, 'sp_admin_hs_trashed')
    await target.softDelete()

    const response = await client.get('/api/users/trashed').bearerToken(token)
    response.assertStatus(200)

    const found = response.body().users.find((u: { id: string }) => u.id === target.id)
    assert.exists(found)
    assert.equal(found.hasSpotify, true)
  })

  test('GET /api/users?includeDeleted=true exposes hasSpotify on every user', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('admin_hs_with_trashed', 'admin')
    const target = await User.create(makeUser('hs_with_trashed'))
    await linkSpotify(target.id, 'sp_admin_hs_with_trashed')
    await target.softDelete()

    const response = await client
      .get('/api/users')
      .qs({ includeDeleted: 'true' })
      .bearerToken(token)
    response.assertStatus(200)

    const found = response.body().users.find((u: { id: string }) => u.id === target.id)
    assert.exists(found)
    assert.equal(found.hasSpotify, true)
  })
})

test.group('AdminUserIntegrationsController - status', (group) => {
  deleteUserIntegrations(group)

  test('GET /api/users/:id/spotify/status returns 401 without auth', async ({ client }) => {
    const target = await User.create(makeUser('admin_status_unauth'))
    const response = await client.get(`/api/users/${target.id}/spotify/status`)
    response.assertStatus(401)
  })

  test('GET /api/users/:id/spotify/status returns 403 for non-admin user', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin_status_user', 'user')
    const target = await User.create(makeUser('admin_status_user_target'))
    const response = await client
      .get(`/api/users/${target.id}/spotify/status`)
      .bearerToken(token)
    response.assertStatus(403)
  })

  test('GET /api/users/:id/spotify/status returns 404 for missing user', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin_status_missing', 'admin')
    const response = await client
      .get('/api/users/non-existent-id/spotify/status')
      .bearerToken(token)
    response.assertStatus(404)
    response.assertBodyContains({ message: 'User not found' })
  })

  test('GET /api/users/:id/spotify/status returns connected=false when no integration', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('admin_status_off', 'admin')
    const target = await User.create(makeUser('admin_status_off_target'))

    const response = await client
      .get(`/api/users/${target.id}/spotify/status`)
      .bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().connected, false)
    assert.isNull(response.body().providerUserId)
  })

  test('GET /api/users/:id/spotify/status returns full metadata when linked', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('admin_status_on', 'admin')
    const target = await User.create(makeUser('admin_status_on_target'))
    await linkSpotify(target.id, 'sp_admin_status')

    const response = await client
      .get(`/api/users/${target.id}/spotify/status`)
      .bearerToken(token)
    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.connected, true)
    assert.equal(body.providerUserId, 'sp_admin_status')
    assert.equal(body.scopes, 'user-top-read')
    assert.notProperty(body, 'accessToken')
    assert.notProperty(body, 'refreshToken')
  })
})

test.group('AdminUserIntegrationsController - top tracks / artists / recently played', (group) => {
  deleteUserIntegrations(group)
  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('GET /top-tracks returns 422 for invalid timeRange', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin_tt_bad', 'admin')
    const target = await User.create(makeUser('admin_tt_bad_target'))
    await linkSpotify(target.id, 'sp_tt_bad')

    const response = await client
      .get(`/api/users/${target.id}/spotify/top-tracks`)
      .qs({ timeRange: 'nope' })
      .bearerToken(token)
    response.assertStatus(422)
  })

  test('GET /top-tracks returns 404 for user without integration', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin_tt_nolink', 'admin')
    const target = await User.create(makeUser('admin_tt_nolink_target'))

    const response = await client
      .get(`/api/users/${target.id}/spotify/top-tracks`)
      .bearerToken(token)
    response.assertStatus(404)
  })

  test('GET /top-tracks returns 200 with data for a linked user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin_tt_ok', 'admin')
    const target = await User.create(makeUser('admin_tt_ok_target'))
    await linkSpotify(target.id, 'sp_tt_ok')

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ items: [{ id: 'admin_track_a', name: 'Track A' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client
      .get(`/api/users/${target.id}/spotify/top-tracks`)
      .bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().items[0].id, 'admin_track_a')
  })

  test('GET /top-artists returns 200 with data', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin_ta_ok', 'admin')
    const target = await User.create(makeUser('admin_ta_ok_target'))
    await linkSpotify(target.id, 'sp_ta_ok')

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ items: [{ id: 'admin_artist_a', name: 'Artist A' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client
      .get(`/api/users/${target.id}/spotify/top-artists`)
      .bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().items[0].id, 'admin_artist_a')
  })

  test('GET /recently-played returns 200 with data', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser('admin_rp_ok', 'admin')
    const target = await User.create(makeUser('admin_rp_ok_target'))
    await linkSpotify(target.id, 'sp_rp_ok')

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ items: [{ track: { id: 'admin_recent_a' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client
      .get(`/api/users/${target.id}/spotify/recently-played`)
      .bearerToken(token)
    response.assertStatus(200)
    assert.equal(response.body().items[0].track.id, 'admin_recent_a')
  })

  test('GET /top-tracks returns 401 when integration is expired with no refresh token', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('admin_tt_norefresh', 'admin')
    const target = await User.create(makeUser('admin_tt_norefresh_target'))
    await new SpotifyService().upsertIntegration(target.id, {
      providerUserId: 'sp_norefresh_admin',
      accessToken: 'expired',
      refreshToken: null,
      expiresAt: DateTime.now().minus({ minutes: 5 }),
    })

    const response = await client
      .get(`/api/users/${target.id}/spotify/top-tracks`)
      .bearerToken(token)
    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Spotify session expired, the user must reconnect',
    })
  })

  test('GET /top-tracks returns 500 on generic Spotify API error', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin_tt_500', 'admin')
    const target = await User.create(makeUser('admin_tt_500_target'))
    await linkSpotify(target.id, 'sp_tt_500')

    globalThis.fetch = async () =>
      new Response('{"error":{"status":500}}', {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client
      .get(`/api/users/${target.id}/spotify/top-tracks`)
      .bearerToken(token)
    response.assertStatus(500)
    response.assertBodyContains({ message: 'Failed to fetch Spotify data' })
  })

  test('GET /top-artists returns 500 on generic Spotify API error', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin_ta_500', 'admin')
    const target = await User.create(makeUser('admin_ta_500_target'))
    await linkSpotify(target.id, 'sp_ta_500')

    globalThis.fetch = async () =>
      new Response('{"error":{"status":500}}', {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client
      .get(`/api/users/${target.id}/spotify/top-artists`)
      .bearerToken(token)
    response.assertStatus(500)
    response.assertBodyContains({ message: 'Failed to fetch Spotify data' })
  })

  test('GET /recently-played returns 500 on generic Spotify API error', async ({ client }) => {
    const { token } = await createAuthenticatedUser('admin_rp_500', 'admin')
    const target = await User.create(makeUser('admin_rp_500_target'))
    await linkSpotify(target.id, 'sp_rp_500')

    globalThis.fetch = async () =>
      new Response('{"error":{"status":500}}', {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })

    const response = await client
      .get(`/api/users/${target.id}/spotify/recently-played`)
      .bearerToken(token)
    response.assertStatus(500)
    response.assertBodyContains({ message: 'Failed to fetch Spotify data' })
  })
})
