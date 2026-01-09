import { test } from '@japa/runner'
import User from '#models/user'
import RefreshToken from '#models/refresh_token'
import EmailVerificationToken from '#models/email_verification_token'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import mail from '@adonisjs/mail/services/main'

const makeUser = (prefix: string) => {
  const timestamp = Date.now() + Math.random()
  return {
    username: `${prefix}_${timestamp}`,
    email: `${prefix}_${timestamp}@example.com`,
    password: 'password123',
  }
}

test.group('AuthController - Register', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('POST /api/auth/register should create a new user', async ({ client, assert }) => {
    const userData = makeUser('register')
    const mailer = mail.fake()

    const response = await client.post('/api/auth/register').json({
      ...userData,
      firstName: 'John',
      lastName: 'Doe',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        user: {
          email: userData.email,
          username: userData.username,
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    })

    const createdUser = response.body().data.user
    assert.notExists(createdUser.password)

    const user = await User.findBy('email', userData.email)
    assert.isNotNull(user)
    assert.isNull(user!.emailVerifiedAt)

    mailer.messages.assertSentCount(1)

    mail.restore()
  }).timeout(10000)

  test('POST /api/auth/register should work with minimal data', async ({ client, assert }) => {
    const userData = makeUser('minimal')

    mail.fake()

    const response = await client.post('/api/auth/register').json(userData)

    response.assertStatus(201)

    const createdUser = response.body().data.user
    assert.equal(createdUser.email, userData.email)
    assert.equal(createdUser.username, userData.username)

    mail.restore()
  }).timeout(10000)

  test('POST /api/auth/register should fail with duplicate email', async ({ client }) => {
    const existing = makeUser('existing')
    await User.create(existing)

    mail.fake()

    const response = await client.post('/api/auth/register').json({
      ...makeUser('new'),
      email: existing.email,
    })

    response.assertStatus(422)
    response.assertBodyContains({
      message: 'Validation failed',
    })

    mail.restore()
  }).timeout(10000)

  test('POST /api/auth/register should fail with duplicate username', async ({ client }) => {
    const existing = makeUser('existing')
    await User.create(existing)

    mail.fake()

    const response = await client.post('/api/auth/register').json({
      ...makeUser('new'),
      username: existing.username,
    })

    response.assertStatus(422)
    response.assertBodyContains({
      message: 'Validation failed',
    })

    mail.restore()
  }).timeout(10000)

  test('POST /api/auth/register should fail with short password', async ({ client }) => {
    const userData = makeUser('short')

    mail.fake()

    const response = await client.post('/api/auth/register').json({
      email: userData.email,
      username: userData.username,
      password: 'short',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      message: 'Validation failed',
    })

    mail.restore()
  }).timeout(10000)

  test('POST /api/auth/register should fail with invalid email', async ({ client }) => {
    const userData = makeUser('invalid')

    mail.fake()

    const response = await client.post('/api/auth/register').json({
      email: 'invalid-email',
      username: userData.username,
      password: userData.password,
    })

    response.assertStatus(422)
    response.assertBodyContains({
      message: 'Validation failed',
    })

    mail.restore()
  }).timeout(10000)

  test('POST /api/auth/register should fail with short username', async ({ client }) => {
    const userData = makeUser('un')

    mail.fake()

    const response = await client.post('/api/auth/register').json({
      email: userData.email,
      username: 'ab',
      password: userData.password,
    })

    response.assertStatus(422)
    response.assertBodyContains({
      message: 'Validation failed',
    })

    mail.restore()
  }).timeout(10000)
})

test.group('AuthController - Login', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('POST /api/auth/login should succeed with valid credentials', async ({ client, assert }) => {
    const userData = makeUser('login')
    await User.create({
      ...userData,
      emailVerifiedAt: DateTime.now(),
    })

    const response = await client.post('/api/auth/login').json({
      email: userData.email,
      password: userData.password,
    })

    response.assertStatus(200)

    const body = response.body()
    assert.property(body, 'accessToken')
    assert.property(body, 'refreshToken')
    assert.isString(body.accessToken)
    assert.isString(body.refreshToken)
  })

  test('POST /api/auth/login should fail with invalid email', async ({ client }) => {
    const response = await client.post('/api/auth/login').json({
      email: 'nonexistent@example.com',
      password: 'password123',
    })

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Invalid credentials',
    })
  })

  test('POST /api/auth/login should fail with invalid password', async ({ client }) => {
    const userData = makeUser('wrongpwd')
    await User.create({
      ...userData,
      emailVerifiedAt: DateTime.now(),
    })

    const response = await client.post('/api/auth/login').json({
      email: userData.email,
      password: 'wrongpassword',
    })

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Invalid credentials',
    })
  })

  test('POST /api/auth/login should fail when email not verified', async ({ client }) => {
    const userData = makeUser('unverified')
    await User.create(userData)

    const response = await client.post('/api/auth/login').json({
      email: userData.email,
      password: userData.password,
    })

    response.assertStatus(403)
    response.assertBodyContains({
      message: 'Please verify your email before logging in',
    })
  })

  test('POST /api/auth/login should fail with validation errors', async ({ client }) => {
    const response = await client.post('/api/auth/login').json({
      email: 'invalid-email',
      password: 'password123',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      message: 'Validation failed',
    })
  })

  test('POST /api/auth/login should create refresh token', async ({ client, assert }) => {
    const userData = makeUser('refresh')
    const user = await User.create({
      ...userData,
      emailVerifiedAt: DateTime.now(),
    })

    const response = await client.post('/api/auth/login').json({
      email: userData.email,
      password: userData.password,
    })

    response.assertStatus(200)

    const refreshTokens = await RefreshToken.query().where('userId', user.id)
    assert.isAtLeast(refreshTokens.length, 1)
  })
})

test.group('AuthController - Refresh Token', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('POST /api/auth/refresh should generate new access token', async ({ client, assert }) => {
    const userData = makeUser('refresh')
    await User.create({
      ...userData,
      emailVerifiedAt: DateTime.now(),
    })

    const loginResponse = await client.post('/api/auth/login').json({
      email: userData.email,
      password: userData.password,
    })

    const { refreshToken } = loginResponse.body()

    const response = await client.post('/api/auth/refresh').json({
      refreshToken,
    })

    response.assertStatus(200)
    assert.property(response.body(), 'accessToken')
    assert.isString(response.body().accessToken)
  })

  test('POST /api/auth/refresh should fail with invalid token', async ({ client }) => {
    const response = await client.post('/api/auth/refresh').json({
      refreshToken: 'invalid.token',
    })

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Invalid refresh token',
    })
  })

  test('POST /api/auth/refresh should fail with malformed token', async ({ client }) => {
    const response = await client.post('/api/auth/refresh').json({
      refreshToken: 'malformed-token',
    })

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Invalid refresh token',
    })
  })

  test('POST /api/auth/refresh should fail with expired token', async ({ client, assert }) => {
    const userData = makeUser('expired')
    const user = await User.create({
      ...userData,
      emailVerifiedAt: DateTime.now(),
    })

    const selector = 'expired_selector'
    const verifier = 'expired_verifier'
    const tokenHash = await hash.make(verifier)

    await RefreshToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().minus({ days: 1 }),
    })

    const response = await client.post('/api/auth/refresh').json({
      refreshToken: `${selector}.${verifier}`,
    })

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Refresh token expired',
    })

    const tokens = await RefreshToken.query().where('selector', selector)
    assert.equal(tokens.length, 0)
  })

  test('POST /api/auth/refresh should fail with validation errors', async ({ client }) => {
    const response = await client.post('/api/auth/refresh').json({})

    response.assertStatus(422)
    response.assertBodyContains({
      message: 'Validation failed',
    })
  })
})

test.group('AuthController - Logout', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('POST /api/auth/logout should logout user successfully', async ({ client, assert }) => {
    const userData = makeUser('logout')
    const user = await User.create({
      ...userData,
      emailVerifiedAt: DateTime.now(),
    })

    const loginResponse = await client.post('/api/auth/login').json({
      email: userData.email,
      password: userData.password,
    })

    const { accessToken, refreshToken } = loginResponse.body()

    const response = await client
      .post('/api/auth/logout')
      .bearerToken(accessToken)
      .json({ refreshToken })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Logout successful',
    })

    const refreshTokens = await RefreshToken.query().where('userId', user.id)
    assert.equal(refreshTokens.length, 0)
  })

  test('POST /api/auth/logout should work without refresh token', async ({ client }) => {
    const userData = makeUser('logout_no_refresh')
    await User.create({
      ...userData,
      emailVerifiedAt: DateTime.now(),
    })

    const loginResponse = await client.post('/api/auth/login').json({
      email: userData.email,
      password: userData.password,
    })

    const { accessToken } = loginResponse.body()

    const response = await client.post('/api/auth/logout').bearerToken(accessToken)

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Logout successful',
    })
  })

  test('POST /api/auth/logout should require authentication', async ({ client }) => {
    const response = await client.post('/api/auth/logout')

    response.assertStatus(401)
  })
})

test.group('AuthController - Email Verification', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('POST /api/auth/verify-email should verify user email', async ({ client, assert }) => {
    const userData = makeUser('verify')
    const user = await User.create(userData)

    const selector = `verify_selector_${Date.now()}_${Math.floor(Math.random() * 1000000)}`
    const verifier = 'verify_verifier'
    const tokenHash = await hash.make(verifier)

    await EmailVerificationToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    const response = await client.post('/api/auth/verify-email').json({
      token: `${selector}.${verifier}`,
    })

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.user.id, user.id)
    assert.equal(body.user.email, user.email)
    assert.isNotNull(body.user.emailVerifiedAt)

    await user.refresh()
    assert.isNotNull(user.emailVerifiedAt)
  })

  test('POST /api/auth/verify-email should fail without token', async ({ client }) => {
    const response = await client.post('/api/auth/verify-email').json({})

    response.assertStatus(400)
    response.assertBodyContains({
      message: 'Verification token is required',
    })
  })

  test('POST /api/auth/verify-email should fail with invalid token', async ({ client }) => {
    const response = await client.post('/api/auth/verify-email').json({
      token: 'invalid.token',
    })

    response.assertStatus(400)
    response.assertBodyContains({
      message: 'Invalid verification token',
    })
  })

  test('POST /api/auth/verify-email should fail with expired token', async ({ client }) => {
    const userData = makeUser('verify_expired')
    const user = await User.create(userData)

    const selector = `expired_selector_${Date.now()}_${Math.floor(Math.random() * 1000000)}`
    const verifier = 'expired_verifier'
    const tokenHash = await hash.make(verifier)

    await EmailVerificationToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().minus({ hours: 1 }),
    })

    const response = await client.post('/api/auth/verify-email').json({
      token: `${selector}.${verifier}`,
    })

    response.assertStatus(400)
    response.assertBodyContains({
      message: 'Verification token expired. Please request a new one.',
    })
  })

  test('POST /api/auth/verify-email should fail with malformed token', async ({ client }) => {
    const response = await client.post('/api/auth/verify-email').json({
      token: 'malformed-token',
    })

    response.assertStatus(400)
    response.assertBodyContains({
      message: 'Invalid verification token',
    })
  })
})

test.group('AuthController - Resend Verification Email', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('POST /api/auth/resend-verification should send email', async ({ client }) => {
    const userData = makeUser('resend')
    await User.create(userData)

    const mailer = mail.fake()

    const response = await client.post('/api/auth/resend-verification').json({
      email: userData.email,
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'If the email exists and is not verified, a verification email has been sent',
    })

    mailer.messages.assertSentCount(1)

    mail.restore()
  }).timeout(10000)

  test('POST /api/auth/resend-verification should not leak user existence', async ({ client }) => {
    const response = await client.post('/api/auth/resend-verification').json({
      email: 'nonexistent@example.com',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'If the email exists and is not verified, a verification email has been sent',
    })
  })

  test('POST /api/auth/resend-verification should not send for verified users', async ({
    client,
  }) => {
    const userData = makeUser('verified')
    await User.create({
      ...userData,
      emailVerifiedAt: DateTime.now(),
    })

    const mailer = mail.fake()

    const response = await client.post('/api/auth/resend-verification').json({
      email: userData.email,
    })

    response.assertStatus(200)

    mailer.messages.assertNoneSent()

    mail.restore()
  }).timeout(10000)

  test('POST /api/auth/resend-verification should fail with validation errors', async ({
    client,
  }) => {
    const response = await client.post('/api/auth/resend-verification').json({
      email: 'invalid-email',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      message: 'Validation failed',
    })
  })
})

test.group('AuthController - Me Endpoint', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('GET /api/auth/me should return authenticated user details', async ({ client, assert }) => {
    const userData = makeUser('me')
    const user = await User.create({
      ...userData,
      firstName: 'John',
      lastName: 'Doe',
      emailVerifiedAt: DateTime.now(),
    })

    const token = await User.accessTokens.create(user)

    const response = await client.get('/api/auth/me').bearerToken(token.value!.release())

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data.user.id, user.id)
    assert.equal(body.data.user.email, user.email)
    assert.equal(body.data.user.username, user.username)
    assert.equal(body.data.user.firstName, 'John')
    assert.equal(body.data.user.lastName, 'Doe')
    assert.equal(body.data.user.role, 'user')
    assert.isNotNull(body.data.user.emailVerifiedAt)
    assert.isNotNull(body.data.user.createdAt)
    assert.notExists(body.data.user.password)
  })

  test('GET /api/auth/me should require authentication', async ({ client }) => {
    const response = await client.get('/api/auth/me')

    response.assertStatus(401)
  })

  test('GET /api/auth/me should fail with invalid token', async ({ client }) => {
    const response = await client.get('/api/auth/me').bearerToken('invalid-token')

    response.assertStatus(401)
  })
})

test.group('AuthController - Complete Authentication Flow', (group) => {
  group.setup(async () => {
    await testUtils.db().truncate()
  })

  group.each.setup(async () => {
    await testUtils.db().truncate()
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('Complete flow: register -> verify -> login -> me -> refresh -> logout', async ({
    client,
    assert,
  }) => {
    const userData = makeUser('complete')

    mail.fake()

    let response = await client.post('/api/auth/register').json({
      ...userData,
      firstName: 'Complete',
      lastName: 'Flow',
    })
    response.assertStatus(201)

    const user = await User.findByOrFail('email', userData.email)

    const verificationToken = await EmailVerificationToken.query()
      .where('userId', user.id)
      .firstOrFail()
    const fullToken = `${verificationToken.selector}.verifier`

    verificationToken.tokenHash = await hash.make('verifier')
    await verificationToken.save()

    response = await client.post('/api/auth/verify-email').json({
      token: fullToken,
    })
    response.assertStatus(200)

    response = await client.post('/api/auth/login').json({
      email: userData.email,
      password: userData.password,
    })
    response.assertStatus(200)

    const { accessToken, refreshToken } = response.body()

    response = await client.get('/api/auth/me').bearerToken(accessToken)
    response.assertStatus(200)
    assert.equal(response.body().data.user.email, userData.email)

    response = await client.post('/api/auth/refresh').json({ refreshToken })
    response.assertStatus(200)

    const newAccessToken = response.body().accessToken

    response = await client.post('/api/auth/logout').bearerToken(newAccessToken).json({
      refreshToken,
    })
    response.assertStatus(200)

    response = await client.get('/api/auth/me').bearerToken(newAccessToken)
    response.assertStatus(401)

    mail.restore()
  }).timeout(15000)
})
