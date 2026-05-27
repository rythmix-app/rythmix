import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import hash from '@adonisjs/core/services/hash'
import User from '#models/user'
import OAuthLinkConfirmationToken from '#models/oauth_link_confirmation_token'
import UserIntegration from '#models/user_integration'
import { OauthProvider } from '#enums/oauth_provider'
import { IntegrationProvider } from '#enums/integration_provider'
import { deleteAuthData } from '#tests/utils/auth_cleanup_helpers'

function parseLocation(location: string): { base: string; params: URLSearchParams } {
  const [base, qs] = location.split('?')
  return { base, params: new URLSearchParams(qs ?? '') }
}

async function createConfirmation(opts: {
  user: User
  provider: OauthProvider
  providerUserId: string
  expiresAt?: DateTime
  payload?: {
    accessToken: string
    refreshToken: string | null
    expiresAt: string | null
    scopes: string | null
  } | null
}) {
  const selector = randomBytes(32).toString('hex')
  const verifier = randomBytes(32).toString('hex')
  const tokenHash = await hash.make(verifier)

  await OAuthLinkConfirmationToken.create({
    userId: opts.user.id,
    provider: opts.provider,
    providerUserId: opts.providerUserId,
    providerPayload: opts.payload ?? null,
    selector,
    tokenHash,
    expiresAt: opts.expiresAt ?? DateTime.now().plus({ hours: 1 }),
  })

  return `${selector}.${verifier}`
}

test.group('AuthController - confirmOAuthLink', (group) => {
  deleteAuthData(group)

  test('valid Google token links the provider, issues tokens and redirects with confirmed=true', async ({
    client,
    assert,
  }) => {
    const user = await User.create({
      email: `confirm_google_${Date.now()}@example.com`,
      username: `cg_${Date.now()}`,
      password: 'password123',
      role: 'user',
      emailVerifiedAt: DateTime.now(),
    })

    const token = await createConfirmation({
      user,
      provider: OauthProvider.GOOGLE,
      providerUserId: 'g-confirm-1',
    })

    const response = await client.get('/api/auth/oauth/confirm').qs({ token }).redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'ok')
    assert.equal(params.get('provider'), 'google')
    assert.equal(params.get('confirmed'), 'true')
    assert.isNotNull(params.get('accessToken'))
    assert.include(params.get('refreshToken') ?? '', '.')

    await user.refresh()
    assert.equal(user.googleId, 'g-confirm-1')

    const remaining = await OAuthLinkConfirmationToken.query().where('userId', user.id)
    assert.lengthOf(remaining, 0)
  })

  test('valid Spotify token upserts the UserIntegration with payload tokens', async ({
    client,
    assert,
  }) => {
    const user = await User.create({
      email: `confirm_sp_${Date.now()}@example.com`,
      username: `csp_${Date.now()}`,
      password: 'password123',
      role: 'user',
      emailVerifiedAt: DateTime.now(),
    })

    const token = await createConfirmation({
      user,
      provider: OauthProvider.SPOTIFY,
      providerUserId: 'sp-confirm-1',
      payload: {
        accessToken: 'sp-conf-access',
        refreshToken: 'sp-conf-refresh',
        expiresAt: DateTime.now().plus({ hours: 1 }).toISO(),
        scopes: 'user-read-email',
      },
    })

    const response = await client.get('/api/auth/oauth/confirm').qs({ token }).redirects(0)

    response.assertStatus(302)
    await user.refresh()
    assert.equal(user.spotifyId, 'sp-confirm-1')

    const integration = await UserIntegration.query()
      .where('userId', user.id)
      .where('provider', IntegrationProvider.SPOTIFY)
      .first()
    assert.isNotNull(integration)
    assert.equal(integration!.providerUserId, 'sp-confirm-1')
    assert.equal(integration!.accessToken, 'sp-conf-access')
  })

  test('expired token returns oauth_confirmation_expired', async ({ client, assert }) => {
    const user = await User.create({
      email: `confirm_exp_${Date.now()}@example.com`,
      username: `cex_${Date.now()}`,
      password: 'password123',
      role: 'user',
      emailVerifiedAt: DateTime.now(),
    })

    const token = await createConfirmation({
      user,
      provider: OauthProvider.GOOGLE,
      providerUserId: 'g-exp',
      expiresAt: DateTime.now().minus({ minutes: 1 }),
    })

    const response = await client.get('/api/auth/oauth/confirm').qs({ token }).redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_confirmation_expired')

    await user.refresh()
    assert.isNull(user.googleId)
  })

  test('unknown / malformed token returns oauth_confirmation_invalid', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get('/api/auth/oauth/confirm')
      .qs({ token: 'not-a-valid-token' })
      .redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_confirmation_invalid')
  })

  test('replay of a consumed token returns oauth_confirmation_invalid', async ({
    client,
    assert,
  }) => {
    const user = await User.create({
      email: `confirm_replay_${Date.now()}@example.com`,
      username: `crp_${Date.now()}`,
      password: 'password123',
      role: 'user',
      emailVerifiedAt: DateTime.now(),
    })

    const token = await createConfirmation({
      user,
      provider: OauthProvider.GOOGLE,
      providerUserId: 'g-replay',
    })

    const first = await client.get('/api/auth/oauth/confirm').qs({ token }).redirects(0)
    first.assertStatus(302)

    const second = await client.get('/api/auth/oauth/confirm').qs({ token }).redirects(0)
    second.assertStatus(302)
    const { params } = parseLocation(second.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_confirmation_invalid')
  })
})
