import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'
import { AuthService } from '#services/auth_service'
import AuthSessionCreated from '#events/auth_session_created'
import { deleteAuthData } from '#tests/utils/auth_cleanup_helpers'

function uniqueGoogleId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random()}`
}

test.group('AuthService - loginOrCreateFromGoogle', (group) => {
  let authService: AuthService

  deleteAuthData(group)

  group.each.setup(async () => {
    authService = new AuthService()
  })

  test('creates a new user with split first/last name and verified email', async ({ assert }) => {
    const email = `svc_google_new_${Date.now()}@example.com`

    const result = await authService.loginOrCreateFromGoogle({
      email,
      providerUserId: uniqueGoogleId('g-new'),
      name: 'John Michael Doe',
    })

    if (result.status !== 'logged_in') throw new Error('expected logged_in')
    assert.isString(result.accessToken)
    assert.isString(result.refreshToken)
    assert.equal(result.user.email, email)
    assert.equal(result.user.firstName, 'John')
    assert.equal(result.user.lastName, 'Michael Doe')
    assert.isNotNull(result.user.emailVerifiedAt)
    assert.equal(result.user.role, 'user')
  })

  test('creates a user with null firstName/lastName when name is null', async ({ assert }) => {
    const email = `svc_google_noname_${Date.now()}@example.com`

    const result = await authService.loginOrCreateFromGoogle({
      email,
      providerUserId: uniqueGoogleId('g-noname'),
      name: null,
    })

    if (result.status !== 'logged_in') throw new Error('expected logged_in')
    assert.isNull(result.user.firstName)
    assert.isNull(result.user.lastName)
  })

  test('creates a user with only firstName when Google name has one word', async ({ assert }) => {
    const email = `svc_google_single_${Date.now()}@example.com`

    const result = await authService.loginOrCreateFromGoogle({
      email,
      providerUserId: uniqueGoogleId('g-single'),
      name: 'Madonna',
    })

    if (result.status !== 'logged_in') throw new Error('expected logged_in')
    assert.equal(result.user.firstName, 'Madonna')
    assert.isNull(result.user.lastName)
  })

  test('signs an existing user in when the googleId matches', async ({ assert }) => {
    const email = `svc_google_existing_${Date.now()}@example.com`
    const providerUserId = uniqueGoogleId('g-existing')
    const existing = await User.create({
      email,
      username: `svc_existing_${Date.now()}`,
      password: 'password123',
      firstName: 'Original',
      lastName: 'Name',
      role: 'user',
      googleId: providerUserId,
    })

    const result = await authService.loginOrCreateFromGoogle({
      email,
      providerUserId,
      name: 'Ignored Name',
    })

    if (result.status !== 'logged_in') throw new Error('expected logged_in')
    assert.equal(result.user.id, existing.id)
    assert.equal(result.user.firstName, 'Original')
    assert.equal(result.user.lastName, 'Name')
  })

  test('returns pending_confirmation and sends an email when the existing user has no googleId', async ({
    assert,
  }) => {
    const email = `svc_google_pending_${Date.now()}@example.com`
    await User.create({
      email,
      username: `svc_pending_${Date.now()}`,
      password: 'password123',
      role: 'user',
    })

    const mailer = mail.fake()
    const result = await authService.loginOrCreateFromGoogle({
      email,
      providerUserId: uniqueGoogleId('g-pend'),
      name: 'New OAuth Identity',
    })

    assert.equal(result.status, 'pending_confirmation')
    if (result.status !== 'pending_confirmation') throw new Error('unreachable')
    assert.equal(result.email, email)
    mailer.messages.assertSentCount(1)
    mail.restore()
  })

  test('appends a random suffix when the derived username is already taken', async ({ assert }) => {
    const timestamp = Date.now()
    const desiredUsername = `collide${timestamp}`
    await User.create({
      email: `other_${timestamp}@example.com`,
      username: desiredUsername,
      password: 'password123',
      role: 'user',
    })

    const result = await authService.loginOrCreateFromGoogle({
      email: `${desiredUsername}@gmail.com`,
      providerUserId: uniqueGoogleId('g-coll'),
      name: 'Collision User',
    })

    if (result.status !== 'logged_in') throw new Error('expected logged_in')
    assert.notEqual(result.user.username, desiredUsername)
    assert.match(result.user.username, new RegExp(`^${desiredUsername}_[a-f0-9]{6}$`))
  })

  test('pads short local-parts so the username respects the 3-char minimum', async ({ assert }) => {
    const email = `ab@example-${Date.now()}.com`

    const result = await authService.loginOrCreateFromGoogle({
      email,
      providerUserId: uniqueGoogleId('g-pad'),
      name: null,
    })

    if (result.status !== 'logged_in') throw new Error('expected logged_in')
    assert.equal(result.user.username, 'abuser')
  })

  test('dispatches AuthSessionCreated with isFirstLogin=true for a brand-new Google user', async ({
    cleanup,
  }) => {
    const events = emitter.fake([AuthSessionCreated])
    cleanup(() => emitter.restore())

    const email = `svc_google_first_${Date.now()}@example.com`
    const result = await authService.loginOrCreateFromGoogle({
      email,
      providerUserId: uniqueGoogleId('g-first'),
      name: 'First Login',
    })

    if (result.status !== 'logged_in') throw new Error('expected logged_in')

    events.assertEmitted(AuthSessionCreated, ({ data }) => {
      return (
        data.payload.userId === result.user.id &&
        data.payload.isFirstLogin === true &&
        data.payload.lastLoginAt === null
      )
    })
  })

  test('dispatches AuthSessionCreated with isFirstLogin=false for a returning Google user', async ({
    cleanup,
  }) => {
    const email = `svc_google_returning_${Date.now()}@example.com`
    const providerUserId = uniqueGoogleId('g-ret')

    const first = await authService.loginOrCreateFromGoogle({
      email,
      providerUserId,
      name: 'Returning User',
    })
    if (first.status !== 'logged_in') throw new Error('expected logged_in')

    const events = emitter.fake([AuthSessionCreated])
    cleanup(() => emitter.restore())

    const second = await authService.loginOrCreateFromGoogle({
      email,
      providerUserId,
      name: 'Returning User',
    })
    if (second.status !== 'logged_in') throw new Error('expected logged_in')

    events.assertEmitted(AuthSessionCreated, ({ data }) => {
      return (
        data.payload.userId === second.user.id &&
        data.payload.isFirstLogin === false &&
        data.payload.lastLoginAt !== null
      )
    })
  })
})
