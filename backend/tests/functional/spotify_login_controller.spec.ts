import { test } from '@japa/runner'
import { Group } from '@japa/runner/core'
import { DateTime } from 'luxon'
import encryption from '@adonisjs/core/services/encryption'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'
import UserIntegration from '#models/user_integration'
import { IntegrationProvider } from '#enums/integration_provider'
import { OauthProvider } from '#enums/oauth_provider'
import { deleteAuthData } from '#tests/utils/auth_cleanup_helpers'

interface SpotifyFetchScenario {
  tokenResponse?: {
    status: number
    body: {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      scope?: string
      error?: string
    }
  }
  meResponse?: {
    status: number
    body: { id?: string; email?: string; display_name?: string }
  }
}

function installFetchMock(scenario: SpotifyFetchScenario) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('accounts.spotify.com/api/token')) {
      const r = scenario.tokenResponse ?? {
        status: 200,
        body: {
          access_token: 'access-default',
          refresh_token: 'refresh-default',
          expires_in: 3600,
          scope: 'user-read-email',
        },
      }
      return new Response(JSON.stringify(r.body), {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('api.spotify.com/v1/me')) {
      const r = scenario.meResponse ?? {
        status: 200,
        body: { id: 'spotify-default', email: 'default@spotify.test', display_name: 'Default' },
      }
      return new Response(JSON.stringify(r.body), {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return originalFetch(input)
  }) as typeof fetch
  return () => {
    globalThis.fetch = originalFetch
  }
}

function makeState(returnUrl = 'frontmobile://auth/oauth-callback'): string {
  return encryption.encrypt({
    provider: OauthProvider.SPOTIFY,
    returnUrl,
    expiresAt: DateTime.now().plus({ minutes: 5 }).toISO()!,
  })
}

function useFetchCleanup(group: Group) {
  let restore: (() => void) | null = null

  group.each.teardown(() => {
    if (restore) restore()
    restore = null
  })

  return {
    install(scenario: SpotifyFetchScenario) {
      restore = installFetchMock(scenario)
    },
  }
}

function parseLocation(location: string): { base: string; params: URLSearchParams } {
  const [base, qs] = location.split('?')
  return { base, params: new URLSearchParams(qs ?? '') }
}

test.group('SpotifyLoginController - Init', (group) => {
  const fetchMock = useFetchCleanup(group)

  test('returns a Spotify authorize URL with scopes and state', async ({ client, assert }) => {
    fetchMock.install({})
    const response = await client
      .get('/api/auth/spotify/login/init')
      .qs({ returnUrl: 'frontmobile://auth/oauth-callback' })

    response.assertStatus(200)
    const body = response.body() as { authorizeUrl: string }
    assert.match(body.authorizeUrl, /^https:\/\/accounts\.spotify\.com\/authorize\?/)
    const url = new URL(body.authorizeUrl)
    assert.equal(url.searchParams.get('response_type'), 'code')
    assert.equal(url.searchParams.get('scope')?.includes('user-read-email'), true)
    assert.isNotNull(url.searchParams.get('state'))
  })

  test('rejects an unsafe returnUrl', async ({ client }) => {
    fetchMock.install({})
    const response = await client
      .get('/api/auth/spotify/login/init')
      .qs({ returnUrl: 'https://evil.com' })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Invalid returnUrl' })
  })

  test('falls back to the default returnUrl when none is provided', async ({ client, assert }) => {
    fetchMock.install({})
    const response = await client.get('/api/auth/spotify/login/init')

    response.assertStatus(200)
    const body = response.body() as { authorizeUrl: string }
    assert.isString(body.authorizeUrl)
  })
})

test.group('SpotifyLoginController - Callback', (group) => {
  deleteAuthData(group)
  const fetchMock = useFetchCleanup(group)

  test('creates a new user, upserts the integration and redirects with tokens', async ({
    client,
    assert,
  }) => {
    const email = `spotify_new_${Date.now()}@example.com`
    const providerUserId = `spuser-${Date.now()}`
    fetchMock.install({
      tokenResponse: {
        status: 200,
        body: {
          access_token: 'sp-access',
          refresh_token: 'sp-refresh',
          expires_in: 3600,
          scope: 'user-read-email user-top-read',
        },
      },
      meResponse: {
        status: 200,
        body: { id: providerUserId, email, display_name: 'Cool Display' },
      },
    })

    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'ok')
    assert.equal(params.get('provider'), 'spotify')
    assert.isNotNull(params.get('accessToken'))

    const user = await User.findBy('email', email)
    assert.isNotNull(user)
    assert.equal(user!.spotifyId, providerUserId)
    assert.equal(user!.username, 'cooldisplay')

    const integration = await UserIntegration.query()
      .where('userId', user!.id)
      .where('provider', IntegrationProvider.SPOTIFY)
      .first()
    assert.isNotNull(integration)
    assert.equal(integration!.providerUserId, providerUserId)
  })

  test('appends a random suffix when the sanitized display_name is already taken', async ({
    client,
    assert,
  }) => {
    const timestamp = Date.now()
    const desiredUsername = `coolsp${timestamp}`
    await User.create({
      email: `other_sp_${timestamp}@example.com`,
      username: desiredUsername,
      password: 'password123',
      role: 'user',
    })

    const email = `spotify_collide_${timestamp}@example.com`
    fetchMock.install({
      meResponse: {
        status: 200,
        body: { id: `sp-coll-${timestamp}`, email, display_name: desiredUsername },
      },
    })

    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const user = await User.findBy('email', email)
    assert.isNotNull(user)
    assert.notEqual(user!.username, desiredUsername)
    assert.match(user!.username, new RegExp(`^${desiredUsername}_[a-f0-9]{6}$`))
  })

  test('falls back to email-based username when display_name is empty', async ({
    client,
    assert,
  }) => {
    const email = `spotify_fb_${Date.now()}@example.com`
    fetchMock.install({
      meResponse: {
        status: 200,
        body: { id: `spu-fb-${Date.now()}`, email, display_name: '' },
      },
    })

    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const user = await User.findBy('email', email)
    assert.isNotNull(user)
    assert.isAtLeast(user!.username.length, 3)
  })

  test('sends a confirmation email when an existing user has no Spotify link', async ({
    client,
    assert,
  }) => {
    const email = `spotify_pending_${Date.now()}@example.com`
    await User.create({
      email,
      username: `existing_sp_${Date.now()}`,
      password: 'password123',
      role: 'user',
      emailVerifiedAt: DateTime.now(),
    })

    fetchMock.install({
      meResponse: {
        status: 200,
        body: { id: 'sp-new-id', email, display_name: 'Foo' },
      },
    })

    const mailer = mail.fake()
    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'pending_confirmation')
    assert.equal(params.get('provider'), 'spotify')
    assert.equal(params.get('email'), email)
    mailer.messages.assertSentCount(1)
    mail.restore()

    const integration = await UserIntegration.query()
      .whereIn('userId', User.query().select('id').where('email', email))
      .first()
    assert.isNull(integration)
  })

  test('sends a confirmation email when token exchange returns no expires_in', async ({
    client,
    assert,
  }) => {
    const email = `spotify_pending_noexp_${Date.now()}@example.com`
    await User.create({
      email,
      username: `existing_sp_noexp_${Date.now()}`,
      password: 'password123',
      role: 'user',
      emailVerifiedAt: DateTime.now(),
    })

    fetchMock.install({
      tokenResponse: { status: 200, body: { access_token: 'noexp-access' } },
      meResponse: {
        status: 200,
        body: { id: 'sp-new-noexp', email, display_name: 'Foo' },
      },
    })

    const mailer = mail.fake()
    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'pending_confirmation')
    mailer.messages.assertSentCount(1)
    mail.restore()
  })

  test('redirects with status=error when the Spotify token exchange fails', async ({
    client,
    assert,
  }) => {
    fetchMock.install({
      tokenResponse: { status: 400, body: { error: 'invalid_grant' } },
    })

    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'bad', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_error')
  })

  test('redirects with reason=oauth_denied when Spotify returns error=access_denied', async ({
    client,
    assert,
  }) => {
    fetchMock.install({})
    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ error: 'access_denied', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_denied')
  })

  test('redirects with reason=oauth_error when Spotify returns a non-denied error', async ({
    client,
    assert,
  }) => {
    fetchMock.install({})
    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ error: 'server_error', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_error')
  })

  test('redirects with reason=oauth_error when no code is provided', async ({ client, assert }) => {
    fetchMock.install({})
    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_error')
  })

  test('redirects with reason=oauth_no_email when Spotify /v1/me omits the email', async ({
    client,
    assert,
  }) => {
    fetchMock.install({
      meResponse: { status: 200, body: { id: 'sp-noemail', display_name: 'NoEmail' } },
    })

    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_no_email')
  })

  test('redirects with reason=oauth_error when Spotify /v1/me returns non-2xx', async ({
    client,
    assert,
  }) => {
    fetchMock.install({
      meResponse: { status: 500, body: {} },
    })

    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_error')
  })

  test('falls back to default returnUrl when state is missing', async ({ client, assert }) => {
    fetchMock.install({})
    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code' })
      .redirects(0)

    response.assertStatus(302)
    const location = response.headers().location as string
    assert.match(location, /^frontmobile:\/\//)
  })

  test('handles a /v1/me response without display_name and a token response without optional fields', async ({
    client,
    assert,
  }) => {
    const email = `spotify_minimal_${Date.now()}@example.com`
    fetchMock.install({
      tokenResponse: {
        status: 200,
        body: { access_token: 'minimal-access' },
      },
      meResponse: {
        status: 200,
        body: { id: `spu-min-${Date.now()}`, email },
      },
    })

    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const user = await User.findBy('email', email)
    assert.isNotNull(user)
    const integration = await UserIntegration.query()
      .where('userId', user!.id)
      .where('provider', IntegrationProvider.SPOTIFY)
      .first()
    assert.isNotNull(integration)
    assert.equal(integration!.accessToken, 'minimal-access')
    assert.isNull(integration!.refreshToken)
    assert.isNull(integration!.scopes)
    assert.isNull(integration!.expiresAt)
  })

  test('signs in and re-upserts the integration for an existing user with matching spotifyId', async ({
    client,
    assert,
  }) => {
    const email = `spotify_existing_${Date.now()}@example.com`
    const providerUserId = `spu-existing-${Date.now()}`
    const existing = await User.create({
      email,
      username: `existing_match_${Date.now()}`,
      password: 'password123',
      role: 'user',
      emailVerifiedAt: DateTime.now(),
      spotifyId: providerUserId,
    })

    fetchMock.install({
      tokenResponse: {
        status: 200,
        body: {
          access_token: 'rotated-access',
          refresh_token: 'rotated-refresh',
          expires_in: 3600,
          scope: 'user-read-email',
        },
      },
      meResponse: {
        status: 200,
        body: { id: providerUserId, email, display_name: 'Whatever' },
      },
    })

    const response = await client
      .get('/api/auth/spotify/login/callback')
      .qs({ code: 'auth-code', state: makeState() })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'ok')

    const integration = await UserIntegration.query()
      .where('userId', existing.id)
      .where('provider', IntegrationProvider.SPOTIFY)
      .first()
    assert.isNotNull(integration)
    assert.equal(integration!.accessToken, 'rotated-access')
  })
})
