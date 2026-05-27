import { test } from '@japa/runner'
import { Group } from '@japa/runner/core'
import { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'
import { deleteAuthData } from '#tests/utils/auth_cleanup_helpers'

interface AllyMockScenario {
  denied?: boolean
  error?: boolean
  userResponse?: { id?: string | number; email: string | null; name?: string | null }
  throwOnUser?: unknown
}

function buildFakeAlly(scenario: AllyMockScenario) {
  return {
    use() {
      const driver = {
        stateless() {
          return driver
        },
        async redirectUrl(callback?: (req: { param: (k: string, v: string) => void }) => void) {
          const params = new URLSearchParams()
          if (callback) callback({ param: (key, value) => params.set(key, value) })
          const qs = params.toString()
          return qs
            ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=test&${qs}`
            : 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'
        },
        accessDenied() {
          return scenario.denied === true
        },
        hasError() {
          return scenario.error === true
        },
        async user() {
          if ('throwOnUser' in scenario) throw scenario.throwOnUser
          return (
            scenario.userResponse ?? {
              id: 'g-default',
              email: 'default@example.com',
              name: 'Default User',
            }
          )
        },
      }
      return driver
    },
  }
}

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

function useAllyMock(group: Group) {
  let originalDescriptor: PropertyDescriptor | undefined

  group.setup(() => {
    originalDescriptor = Object.getOwnPropertyDescriptor(HttpContext.prototype, 'ally')
  })

  group.each.teardown(() => {
    if (originalDescriptor) {
      Object.defineProperty(HttpContext.prototype, 'ally', originalDescriptor)
    } else {
      delete (HttpContext.prototype as unknown as { ally?: unknown }).ally
    }
  })
}

function parseLocation(location: string): { base: string; params: URLSearchParams } {
  const [base, qs] = location.split('?')
  return { base, params: new URLSearchParams(qs ?? '') }
}

test.group('GoogleAuthController - Redirect', (group) => {
  useAllyMock(group)

  test('GET /api/auth/google/redirect redirects to the Google consent URL', async ({
    client,
    assert,
  }) => {
    installAllyMock({})

    const response = await client.get('/api/auth/google/redirect').redirects(0)

    response.assertStatus(302)
    assert.include(response.headers().location as string, 'accounts.google.com/o/oauth2/v2/auth')
  })

  test('GET /api/auth/google/redirect rejects an unsafe returnUrl', async ({ client }) => {
    installAllyMock({})

    const response = await client
      .get('/api/auth/google/redirect')
      .qs({ returnUrl: 'https://evil.com/steal' })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Invalid returnUrl' })
  })
})

test.group('GoogleAuthController - Callback', (group) => {
  deleteAuthData(group)
  useAllyMock(group)

  test('callback redirects with status=error when Google access is denied', async ({
    client,
    assert,
  }) => {
    installAllyMock({ denied: true })

    const response = await client.get('/api/auth/google/callback').redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_denied')
  })

  test('callback creates a new user and redirects with tokens when email is unknown', async ({
    client,
    assert,
  }) => {
    const email = `google_new_${Date.now()}@example.com`
    installAllyMock({ userResponse: { id: 'g-1', email, name: 'Jane Doe' } })

    const response = await client.get('/api/auth/google/callback').redirects(0)

    response.assertStatus(302)
    const { base, params } = parseLocation(response.headers().location as string)
    assert.match(base, /^frontmobile:\/\//)
    assert.equal(params.get('status'), 'ok')
    assert.equal(params.get('provider'), 'google')
    assert.isNotNull(params.get('accessToken'))
    assert.include(params.get('refreshToken') ?? '', '.')

    const user = await User.findBy('email', email)
    assert.isNotNull(user)
    assert.equal(user!.googleId, 'g-1')
    assert.isNotNull(user!.emailVerifiedAt)
  })

  test('callback signs in an existing user with matching googleId', async ({ client, assert }) => {
    const email = `google_existing_${Date.now()}@example.com`
    const existing = await User.create({
      email,
      username: `existing_${Date.now()}`,
      password: 'password123',
      role: 'user',
      emailVerifiedAt: null,
      googleId: 'g-existing',
    })

    installAllyMock({ userResponse: { id: 'g-existing', email, name: 'Should Not Override' } })

    const response = await client.get('/api/auth/google/callback').redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'ok')
    assert.isNotNull(params.get('accessToken'))

    const usersWithEmail = await User.query().where('email', email)
    assert.lengthOf(usersWithEmail, 1)
    assert.equal(usersWithEmail[0].id, existing.id)
  })

  test('callback sends a confirmation email when an existing user has no Google link', async ({
    client,
    assert,
  }) => {
    const email = `google_pending_${Date.now()}@example.com`
    await User.create({
      email,
      username: `pending_${Date.now()}`,
      password: 'password123',
      role: 'user',
      emailVerifiedAt: null,
    })

    const mailer = mail.fake()
    installAllyMock({ userResponse: { id: 'g-new', email, name: 'Some One' } })

    const response = await client.get('/api/auth/google/callback').redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'pending_confirmation')
    assert.equal(params.get('provider'), 'google')
    assert.equal(params.get('email'), email)

    mailer.messages.assertSentCount(1)
    mail.restore()
  })

  test('callback redirects with status=error when google.user() throws', async ({
    client,
    assert,
  }) => {
    installAllyMock({ throwOnUser: new Error('boom') })

    const response = await client.get('/api/auth/google/callback').redirects(0)

    response.assertStatus(302)
    const { params } = parseLocation(response.headers().location as string)
    assert.equal(params.get('status'), 'error')
    assert.equal(params.get('reason'), 'oauth_error')
  })
})
