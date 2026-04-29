import { test } from '@japa/runner'
import { Group } from '@japa/runner/core'
import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { deleteAuthData } from '#tests/utils/auth_cleanup_helpers'

interface AllyMockScenario {
  denied?: boolean
  error?: boolean
  userResponse?: { email: string | null; name?: string | null }
  throwOnUser?: unknown
}

function buildFakeAlly(scenario: AllyMockScenario) {
  return {
    use() {
      const driver = {
        stateless() {
          return driver
        },
        async redirectUrl() {
          return 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'
        },
        accessDenied() {
          return scenario.denied === true
        },
        hasError() {
          return scenario.error === true
        },
        async user() {
          if ('throwOnUser' in scenario) throw scenario.throwOnUser
          return scenario.userResponse ?? { email: 'default@example.com', name: 'Default User' }
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
})

test.group('GoogleAuthController - Callback', (group) => {
  deleteAuthData(group)
  useAllyMock(group)

  test('callback returns 401 when Google access is denied', async ({ client }) => {
    installAllyMock({ denied: true })

    const response = await client.get('/api/auth/google/callback')

    response.assertStatus(401)
    response.assertBodyContains({ message: 'Google sign-in was cancelled' })
  })

  test('callback returns 400 when Google returned an error', async ({ client }) => {
    installAllyMock({ error: true })

    const response = await client.get('/api/auth/google/callback')

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Google sign-in failed' })
  })

  test('callback returns 400 when Google does not return an email', async ({ client }) => {
    installAllyMock({ userResponse: { email: null, name: 'No Email' } })

    const response = await client.get('/api/auth/google/callback')

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Google did not return an email' })
  })

  test('callback creates a new user and returns tokens when email is unknown', async ({
    client,
    assert,
  }) => {
    const email = `google_new_${Date.now()}@example.com`
    installAllyMock({ userResponse: { email, name: 'Jane Doe' } })

    const response = await client.get('/api/auth/google/callback')

    response.assertStatus(200)
    const body = response.body() as { accessToken: string; refreshToken: string }
    assert.isString(body.accessToken)
    assert.isString(body.refreshToken)
    assert.include(body.refreshToken, '.')

    const user = await User.findBy('email', email)
    assert.isNotNull(user)
    assert.equal(user!.firstName, 'Jane')
    assert.equal(user!.lastName, 'Doe')
    assert.isNotNull(user!.emailVerifiedAt)
  })

  test('callback signs in an existing user and returns tokens', async ({ client, assert }) => {
    const email = `google_existing_${Date.now()}@example.com`
    const existing = await User.create({
      email,
      username: `existing_${Date.now()}`,
      password: 'password123',
      role: 'user',
    })

    installAllyMock({
      userResponse: { email, name: 'Should Not Override' },
    })

    const response = await client.get('/api/auth/google/callback')

    response.assertStatus(200)
    const body = response.body() as { accessToken: string; refreshToken: string }
    assert.isString(body.accessToken)
    assert.isString(body.refreshToken)

    const usersWithEmail = await User.query().where('email', email)
    assert.lengthOf(usersWithEmail, 1)
    assert.equal(usersWithEmail[0].id, existing.id)
  })

  test('callback returns 500 when google.user() throws', async ({ client }) => {
    installAllyMock({ throwOnUser: new Error('boom') })

    const response = await client.get('/api/auth/google/callback')

    response.assertStatus(500)
    response.assertBodyContains({ message: 'Google sign-in failed' })
  })
})
