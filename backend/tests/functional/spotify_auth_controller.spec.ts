import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { HttpContext } from '@adonisjs/core/http'
import encryption from '@adonisjs/core/services/encryption'
import { createAuthenticatedUser } from '../utils/auth_helpers.js'
import { deleteUserIntegrations } from '#tests/utils/user_integration_helpers'
import { SpotifyService } from '#services/spotify_service'

test.group('SpotifyAuthController - Init guards', (group) => {
  deleteUserIntegrations(group)

  test('POST /api/auth/spotify/init returns 401 without auth', async ({ client }) => {
    const response = await client
      .post('/api/auth/spotify/init')
      .json({ returnUrl: 'frontmobile://spotify-linked' })
    response.assertStatus(401)
  })

  test('POST /api/auth/spotify/init returns 422 when returnUrl is missing', async ({ client }) => {
    const { token } = await createAuthenticatedUser('spotify_init_no_return')
    const response = await client.post('/api/auth/spotify/init').json({}).bearerToken(token)
    response.assertStatus(422)
  })

  test('POST /api/auth/spotify/init returns 400 when returnUrl scheme is not allowed', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('spotify_init_bad_scheme')
    const response = await client
      .post('/api/auth/spotify/init')
      .json({ returnUrl: 'https://evil.example.com/callback' })
      .bearerToken(token)
    response.assertStatus(400)
  })

  test('POST /api/auth/spotify/init returns 400 when returnUrl has no scheme', async ({
    client,
  }) => {
    const { token } = await createAuthenticatedUser('spotify_init_no_scheme')
    const response = await client
      .post('/api/auth/spotify/init')
      .json({ returnUrl: 'no-scheme-here' })
      .bearerToken(token)
    response.assertStatus(400)
  })

  test('POST /api/auth/spotify/init returns 200 with Spotify authorize URL', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser('spotify_init_ok')
    const response = await client
      .post('/api/auth/spotify/init')
      .json({ returnUrl: 'frontmobile://spotify-linked' })
      .bearerToken(token)

    response.assertStatus(200)
    const body = response.body() as { authorizeUrl: string }
    assert.include(body.authorizeUrl, 'accounts.spotify.com')
    assert.include(body.authorizeUrl, 'state=')
  })
})

interface AllyMockScenario {
  denied?: boolean
  accessTokenResponse?: Record<string, unknown>
  accessToken?: () => unknown | Promise<unknown>
  throwOnAccessToken?: unknown
}

function buildFakeAlly(scenario: AllyMockScenario) {
  return {
    use() {
      return {
        stateless() {
          return this
        },
        accessDenied() {
          return scenario.denied === true
        },
        async accessToken() {
          if (scenario.accessToken) return scenario.accessToken()
          if ('throwOnAccessToken' in scenario) throw scenario.throwOnAccessToken
          return scenario.accessTokenResponse ?? { token: 'fake-access', expiresIn: 3600 }
        },
      }
    },
  }
}

function buildValidState(userId: string, returnUrl = 'frontmobile://spotify-linked'): string {
  return encryption.encrypt({
    userId,
    returnUrl,
    expiresAt: DateTime.now().plus({ minutes: 10 }).toISO(),
  })
}

test.group('SpotifyAuthController - Callback', (group) => {
  deleteUserIntegrations(group)
  let originalAllyDescriptor: PropertyDescriptor | undefined
  let originalFetch: typeof fetch

  group.each.setup(() => {
    originalAllyDescriptor = Object.getOwnPropertyDescriptor(HttpContext.prototype, 'ally')
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    if (originalAllyDescriptor) {
      Object.defineProperty(HttpContext.prototype, 'ally', originalAllyDescriptor)
    }
    globalThis.fetch = originalFetch
  })

  function installAllyMock(scenario: AllyMockScenario) {
    const fake = buildFakeAlly(scenario)
    Object.defineProperty(HttpContext.prototype, 'ally', {
      get() {
        return fake
      },
      configurable: true,
      enumerable: false,
    })
  }

  test('callback redirects with invalid_state when no state is provided', async ({
    client,
    assert,
  }) => {
    installAllyMock({ denied: false })

    const response = await client.get('/api/auth/spotify/callback').redirects(0)
    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'status=error')
    assert.include(location, 'reason=invalid_state')
  })

  test('callback redirects with access_denied when Spotify denies', async ({ client, assert }) => {
    const { user } = await createAuthenticatedUser('cb_denied')
    installAllyMock({ denied: true })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'frontmobile://spotify-linked')
    assert.include(location, 'reason=access_denied')
  })

  test('callback falls back to the deep link URL on access_denied without state', async ({
    client,
    assert,
  }) => {
    installAllyMock({ denied: true })

    const response = await client.get('/api/auth/spotify/callback').redirects(0)
    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'reason=access_denied')
  })

  test('callback redirects with invalid_state when state is expired', async ({
    client,
    assert,
  }) => {
    installAllyMock({ denied: false })
    const expiredState = encryption.encrypt({
      userId: 'anyone',
      returnUrl: 'frontmobile://spotify-linked',
      expiresAt: DateTime.now().minus({ minutes: 5 }).toISO(),
    })

    const response = await client
      .get('/api/auth/spotify/callback')
      .qs({ state: expiredState })
      .redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'reason=invalid_state')
  })

  test('callback upserts the integration and redirects with status=ok on success', async ({
    client,
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('cb_ok')
    installAllyMock({
      accessTokenResponse: {
        token: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
        scope: 'user-read-email user-top-read',
      },
    })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: 'spotify_me_id', email: 'a@b.c' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'frontmobile://spotify-linked')
    assert.include(location, 'status=ok')

    const integration = await new SpotifyService().findByUserId(user.id)
    assert.isNotNull(integration)
    assert.equal(integration!.providerUserId, 'spotify_me_id')
    assert.equal(integration!.accessToken, 'new-access')
    assert.equal(integration!.refreshToken, 'new-refresh')
    assert.equal(integration!.scopes, 'user-read-email user-top-read')
  })

  test('callback redirects with reason=spotify_me_<status> when /v1/me fails', async ({
    client,
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('cb_me_403')
    installAllyMock({})

    globalThis.fetch = async () =>
      new Response('{"error":{"status":403}}', {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'reason=spotify_me_403')
  })

  test('callback redirects with reason=spotify_me_no_id when /v1/me body has no id', async ({
    client,
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('cb_me_noid')
    installAllyMock({})

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ email: 'no-id@example.com' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'reason=spotify_me_no_id')
  })

  test('callback redirects with an error reason when accessToken throws', async ({
    client,
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('cb_token_throws')
    installAllyMock({ throwOnAccessToken: new Error('invalid_grant') })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'status=error')
    assert.include(location, 'reason=invalid_grant')
  })

  test('callback redirects with unknown_error when a non-Error is thrown', async ({
    client,
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('cb_token_throws_string')
    installAllyMock({ throwOnAccessToken: 'plain string failure' })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'reason=unknown_error')
  })

  test('callback stores a null refresh_token when Spotify omits it', async ({ client, assert }) => {
    const { user } = await createAuthenticatedUser('cb_no_refresh')
    installAllyMock({
      accessTokenResponse: {
        token: 'tok-only',
        expiresIn: 3600,
        scope: 'user-read-email',
      },
    })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: 'spotify_no_refresh' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const integration = await new SpotifyService().findByUserId(user.id)
    assert.isNotNull(integration)
    assert.isNull(integration!.refreshToken)
  })

  test('callback uses token.expiresAt when expiresIn is missing and reads scope from token.original', async ({
    client,
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('cb_expires_at')
    const expiresAt = new Date(Date.now() + 3_600_000)

    installAllyMock({
      accessTokenResponse: {
        token: 'tok',
        refreshToken: 'ref',
        expiresAt,
        original: { scope: 'user-read-email user-top-read' },
      },
    })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: 'spotify_expires_at' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const integration = await new SpotifyService().findByUserId(user.id)
    assert.isNotNull(integration)
    assert.equal(integration!.scopes, 'user-read-email user-top-read')
    assert.isNotNull(integration!.expiresAt)
  })

  test('callback redirects with invalid_state when state cannot be decrypted', async ({
    client,
    assert,
  }) => {
    installAllyMock({ denied: false })

    const response = await client
      .get('/api/auth/spotify/callback')
      .qs({ state: 'not-a-valid-encrypted-state' })
      .redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'reason=invalid_state')
  })

  test('callback redirects with invalid_state when decoded returnUrl has a disallowed scheme', async ({
    client,
    assert,
  }) => {
    installAllyMock({ denied: false })
    const stateWithBadReturn = encryption.encrypt({
      userId: 'any',
      returnUrl: 'https://attacker.example.com/cb',
      expiresAt: DateTime.now().plus({ minutes: 5 }).toISO(),
    })

    const response = await client
      .get('/api/auth/spotify/callback')
      .qs({ state: stateWithBadReturn })
      .redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'reason=invalid_state')
  })

  test('callback appends status with & when returnUrl already has a query string', async ({
    client,
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('cb_query_string')
    installAllyMock({
      accessTokenResponse: {
        token: 'tok',
        refreshToken: 'ref',
        expiresIn: 3600,
        scope: 'user-top-read',
      },
    })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: 'spotify_qs' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const state = buildValidState(user.id, 'frontmobile://spotify-linked?existing=1')
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.include(location, 'frontmobile://spotify-linked?existing=1&status=ok')
  })

  test('callback joins array-valued scope with a space', async ({ client, assert }) => {
    const { user } = await createAuthenticatedUser('cb_array_scope')

    installAllyMock({
      accessTokenResponse: {
        token: 'tok',
        refreshToken: 'ref',
        expiresIn: 3600,
        scope: ['user-read-email', 'user-top-read'],
      },
    })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: 'spotify_array_scope' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const integration = await new SpotifyService().findByUserId(user.id)
    assert.equal(integration!.scopes, 'user-read-email user-top-read')
  })

  test('callback stores a null expiresAt when neither expiresIn nor expiresAt are present', async ({
    client,
    assert,
  }) => {
    const { user } = await createAuthenticatedUser('cb_no_expiry')

    installAllyMock({ accessTokenResponse: { token: 'tok', refreshToken: 'ref' } })

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: 'spotify_no_expiry' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const state = buildValidState(user.id)
    const response = await client.get('/api/auth/spotify/callback').qs({ state }).redirects(0)

    response.assertStatus(302)
    const integration = await new SpotifyService().findByUserId(user.id)
    assert.isNotNull(integration)
    assert.isNull(integration!.expiresAt)
  })
})
