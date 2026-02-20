import { test } from '@japa/runner'
import User from '#models/user'
import RefreshToken from '#models/refresh_token'
import EmailVerificationToken from '#models/email_verification_token'
import { AuthService } from '#services/auth_service'
import hash from '@adonisjs/core/services/hash'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import { deleteAuthData } from '#tests/utils/auth_cleanup_helpers'

test.group('AuthService - Register', (group) => {
  let authService: AuthService

  deleteAuthData(group)

  group.each.setup(async () => {
    authService = new AuthService()
  })

  test('register should create a new user successfully', async ({ assert }) => {
    const timestamp = Date.now()
    const userData = {
      email: `register_${timestamp}@example.com`,
      username: `register_${timestamp}`,
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
    }

    mail.fake()

    const user = await authService.register(userData)

    assert.instanceOf(user, User)
    assert.equal(user.email, userData.email)
    assert.equal(user.username, userData.username)
    assert.equal(user.firstName, userData.firstName)
    assert.equal(user.lastName, userData.lastName)
    assert.equal(user.role, 'user')
    assert.isUndefined(user.emailVerifiedAt)

    const verificationToken = await EmailVerificationToken.query().where('userId', user.id).first()
    assert.isNotNull(verificationToken)

    mail.restore()
  }).timeout(10000)

  test('register should create user without optional fields', async ({ assert }) => {
    const timestamp = Date.now()
    const userData = {
      email: `minimal_${timestamp}@example.com`,
      username: `minimal_${timestamp}`,
      password: 'password123',
    }

    mail.fake()

    const user = await authService.register(userData)

    assert.instanceOf(user, User)
    assert.equal(user.email, userData.email)
    assert.equal(user.username, userData.username)
    assert.isUndefined(user.firstName)
    assert.isUndefined(user.lastName)

    mail.restore()
  }).timeout(10000)

  test('register should hash the password', async ({ assert }) => {
    const timestamp = Date.now()
    const plainPassword = 'password123'
    const userData = {
      email: `hash_${timestamp}@example.com`,
      username: `hash_${timestamp}`,
      password: plainPassword,
    }

    mail.fake()

    const user = await authService.register(userData)

    assert.notEqual(user.password, plainPassword)
    const isValid = await hash.verify(user.password, plainPassword)
    assert.isTrue(isValid)

    mail.restore()
  }).timeout(10000)

  test('register should send verification email', async () => {
    const timestamp = Date.now()
    const userData = {
      email: `email_${timestamp}@example.com`,
      username: `email_${timestamp}`,
      password: 'password123',
    }

    const mailer = mail.fake()

    await authService.register(userData)

    mailer.messages.assertSentCount(1)

    mail.restore()
  }).timeout(10000)
})

test.group('AuthService - Login', (group) => {
  let authService: AuthService

  deleteAuthData(group)

  group.each.setup(async () => {
    authService = new AuthService()
  })

  test('login should succeed with valid credentials', async ({ assert }) => {
    const timestamp = Date.now()
    const password = 'password123'
    const user = await User.create({
      email: `login_${timestamp}@example.com`,
      username: `login_${timestamp}`,
      password: password,
      emailVerifiedAt: DateTime.now(),
    })

    const result = await authService.login(user.email, password)

    assert.property(result, 'user')
    assert.property(result, 'accessToken')
    assert.property(result, 'refreshToken')
    assert.equal(result.user.id, user.id)
    assert.isString(result.accessToken)
    assert.isString(result.refreshToken)
  })

  test('login should fail with invalid email', async ({ assert }) => {
    await assert.rejects(async () => {
      await authService.login('nonexistent@example.com', 'password123')
    }, 'Invalid credentials')
  })

  test('login should fail with invalid password', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `wrong_pwd_${timestamp}@example.com`,
      username: `wrong_pwd_${timestamp}`,
      password: 'correctpassword',
      emailVerifiedAt: DateTime.now(),
    })

    await assert.rejects(async () => {
      await authService.login(user.email, 'wrongpassword')
    }, 'Invalid credentials')
  })

  test('login should fail when email not verified', async ({ assert }) => {
    const timestamp = Date.now()
    const password = 'password123'
    const user = await User.create({
      email: `unverified_${timestamp}@example.com`,
      username: `unverified_${timestamp}`,
      password: password,
    })

    await assert.rejects(async () => {
      await authService.login(user.email, password)
    }, 'Email not verified')
  })

  test('login should create refresh token', async ({ assert }) => {
    const timestamp = Date.now()
    const password = 'password123'
    const user = await User.create({
      email: `refresh_${timestamp}@example.com`,
      username: `refresh_${timestamp}`,
      password: password,
      emailVerifiedAt: DateTime.now(),
    })

    const result = await authService.login(user.email, password)

    const refreshTokens = await RefreshToken.query().where('userId', user.id)
    assert.equal(refreshTokens.length, 1)

    const tokenParts = result.refreshToken.split('.')
    assert.equal(tokenParts.length, 2)
  })
})

test.group('AuthService - Refresh Token', (group) => {
  let authService: AuthService

  deleteAuthData(group)

  group.each.setup(async () => {
    authService = new AuthService()
  })

  test('refresh should generate new access token with valid refresh token', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `refresh_valid_${timestamp}@example.com`,
      username: `refresh_valid_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const loginResult = await authService.login(user.email, 'password123')
    const result = await authService.refresh(loginResult.refreshToken)

    assert.property(result, 'accessToken')
    assert.isString(result.accessToken)
  })

  test('refresh should fail with invalid token format', async ({ assert }) => {
    await assert.rejects(async () => {
      await authService.refresh('invalid-token')
    }, 'Invalid refresh token')
  })

  test('refresh should fail with invalid selector', async ({ assert }) => {
    await assert.rejects(async () => {
      await authService.refresh('invalidselector.invalidverifier')
    }, 'Invalid refresh token')
  })

  test('refresh should fail with expired token', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `expired_${timestamp}@example.com`,
      username: `expired_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const selector = `selector_expired_${timestamp}`
    const verifier = 'verifier'
    const tokenHash = await hash.make(verifier)

    await RefreshToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().minus({ days: 1 }),
    })

    await assert.rejects(async () => {
      await authService.refresh(`${selector}.${verifier}`)
    }, 'Refresh token expired')

    const tokens = await RefreshToken.query().where('selector', selector)
    assert.equal(tokens.length, 0)
  })

  test('refresh should fail with invalid verifier', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `wrong_verifier_${timestamp}@example.com`,
      username: `wrong_verifier_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const selector = `selector_invalid_verifier_${timestamp}`
    const correctVerifier = 'correctverifier'
    const tokenHash = await hash.make(correctVerifier)

    await RefreshToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().plus({ days: 7 }),
    })

    await assert.rejects(async () => {
      await authService.refresh(`${selector}.wrongverifier`)
    }, 'Invalid refresh token')
  })
})

test.group('AuthService - Logout', (group) => {
  let authService: AuthService

  deleteAuthData(group)

  group.each.setup(async () => {
    authService = new AuthService()
  })

  test('logout should revoke access token', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `logout_${timestamp}@example.com`,
      username: `logout_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const token = await User.accessTokens.create(user)
    const tokenIdentifier = String(token.identifier)

    await authService.logout(user, tokenIdentifier)

    const accessToken = await User.accessTokens.find(user, tokenIdentifier)
    assert.isNull(accessToken)
  })

  test('logout should revoke refresh token when provided', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `logout_refresh_${timestamp}@example.com`,
      username: `logout_refresh_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const loginResult = await authService.login(user.email, 'password123')
    const token = await User.accessTokens.create(user)

    await authService.logout(user, String(token.identifier), loginResult.refreshToken)

    const refreshTokens = await RefreshToken.query().where('userId', user.id)
    assert.equal(refreshTokens.length, 0)
  })

  test('logout should handle invalid refresh token format gracefully', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `logout_invalid_${timestamp}@example.com`,
      username: `logout_invalid_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const token = await User.accessTokens.create(user)

    await authService.logout(user, String(token.identifier), 'invalid-token')

    assert.isTrue(true)
  })

  test('logout should work without refresh token', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `logout_no_refresh_${timestamp}@example.com`,
      username: `logout_no_refresh_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const token = await User.accessTokens.create(user)

    await authService.logout(user, String(token.identifier))

    const accessToken = await User.accessTokens.find(user, String(token.identifier))
    assert.isNull(accessToken)
  })
})

test.group('AuthService - Email Verification', (group) => {
  let authService: AuthService

  deleteAuthData(group)

  group.each.setup(async () => {
    authService = new AuthService()
  })

  test('verifyEmail should verify user email with valid token', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `verify_${timestamp}@example.com`,
      username: `verify_${timestamp}`,
      password: 'password123',
    })

    const selector = `selector_verify_${timestamp}`
    const verifier = 'verifier'
    const tokenHash = await hash.make(verifier)

    await EmailVerificationToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    const verifiedUser = await authService.verifyEmail(`${selector}.${verifier}`)

    assert.equal(verifiedUser.id, user.id)
    assert.isNotNull(verifiedUser.emailVerifiedAt)

    const token = await EmailVerificationToken.query().where('selector', selector).first()
    assert.isNull(token)
  })

  test('verifyEmail should fail with invalid token format', async ({ assert }) => {
    await assert.rejects(async () => {
      await authService.verifyEmail('invalid-token')
    }, 'Invalid verification token')
  })

  test('verifyEmail should fail with invalid selector', async ({ assert }) => {
    await assert.rejects(async () => {
      await authService.verifyEmail('invalidselector.invalidverifier')
    }, 'Invalid verification token')
  })

  test('verifyEmail should fail with expired token', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `verify_expired_${timestamp}@example.com`,
      username: `verify_expired_${timestamp}`,
      password: 'password123',
    })

    const selector = `selector_expired_${timestamp}`
    const verifier = 'verifier'
    const tokenHash = await hash.make(verifier)

    await EmailVerificationToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().minus({ hours: 1 }),
    })

    await assert.rejects(async () => {
      await authService.verifyEmail(`${selector}.${verifier}`)
    }, 'Verification token expired')

    const token = await EmailVerificationToken.query().where('selector', selector).first()
    assert.isNull(token)
  })

  test('verifyEmail should fail with invalid verifier', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `verify_wrong_${timestamp}@example.com`,
      username: `verify_wrong_${timestamp}`,
      password: 'password123',
    })

    const selector = `selector_wrong_${timestamp}`
    const correctVerifier = 'correctverifier'
    const tokenHash = await hash.make(correctVerifier)

    await EmailVerificationToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    await assert.rejects(async () => {
      await authService.verifyEmail(`${selector}.wrongverifier`)
    }, 'Invalid verification token')
  })

  test('sendVerificationEmail should delete old tokens before creating new one', async ({
    assert,
  }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `send_verify_${timestamp}@example.com`,
      username: `send_verify_${timestamp}`,
      password: 'password123',
    })

    const oldSelector = `old_selector_${timestamp}`

    await EmailVerificationToken.create({
      userId: user.id,
      selector: oldSelector,
      tokenHash: 'old_hash',
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    const mailer = mail.fake()

    await authService.sendVerificationEmail(user)

    const tokens = await EmailVerificationToken.query().where('userId', user.id)
    assert.equal(tokens.length, 1)
    assert.notEqual(tokens[0].selector, oldSelector)

    mailer.messages.assertSentCount(1)

    mail.restore()
  }).timeout(10000)
})

test.group('AuthService - Resend Verification Email', (group) => {
  let authService: AuthService

  deleteAuthData(group)

  group.each.setup(async () => {
    authService = new AuthService()
  })

  test('resendVerificationEmail should send email for unverified user', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `resend_${timestamp}@example.com`,
      username: `resend_${timestamp}`,
      password: 'password123',
    })

    const mailer = mail.fake()

    const result = await authService.resendVerificationEmail(user.email)

    assert.isNotNull(result)
    assert.equal(result!.id, user.id)

    mailer.messages.assertSentCount(1)

    mail.restore()
  }).timeout(10000)

  test('resendVerificationEmail should return null for non-existent user', async ({ assert }) => {
    const result = await authService.resendVerificationEmail('nonexistent@example.com')

    assert.isNull(result)
  })

  test('resendVerificationEmail should return null for already verified user', async ({
    assert,
  }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `verified_${timestamp}@example.com`,
      username: `verified_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const result = await authService.resendVerificationEmail(user.email)

    assert.isNull(result)
  })
})

test.group('AuthService - Token Management', (group) => {
  let authService: AuthService

  deleteAuthData(group)

  group.each.setup(async () => {
    authService = new AuthService()
  })

  test('revokeAllRefreshTokens should delete all user refresh tokens', async ({ assert }) => {
    const timestamp = Date.now()
    const user = await User.create({
      email: `revoke_all_${timestamp}@example.com`,
      username: `revoke_all_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    await authService.login(user.email, 'password123')
    await authService.login(user.email, 'password123')

    let tokens = await RefreshToken.query().where('userId', user.id)
    assert.equal(tokens.length, 2)

    await authService.revokeAllRefreshTokens(user.id)

    tokens = await RefreshToken.query().where('userId', user.id)
    assert.equal(tokens.length, 0)
  })

  test('cleanExpiredTokens should delete only expired refresh tokens', async ({ assert }) => {
    const timestamp = Date.now()
    const user1 = await User.create({
      email: `clean_expired_1_${timestamp}@example.com`,
      username: `clean_expired_1_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const user2 = await User.create({
      email: `clean_expired_2_${timestamp}@example.com`,
      username: `clean_expired_2_${timestamp}`,
      password: 'password123',
      emailVerifiedAt: DateTime.now(),
    })

    const expiredSelector = `expired_selector_${timestamp}`
    const validSelector = `valid_selector_${timestamp}`

    await RefreshToken.create({
      userId: user1.id,
      selector: expiredSelector,
      tokenHash: 'hash1',
      expiresAt: DateTime.now().minus({ days: 1 }),
    })

    await RefreshToken.create({
      userId: user2.id,
      selector: validSelector,
      tokenHash: 'hash2',
      expiresAt: DateTime.now().plus({ days: 7 }),
    })

    await authService.cleanExpiredTokens()

    const expiredTokens = await RefreshToken.query().where('selector', expiredSelector)
    assert.equal(expiredTokens.length, 0)

    const validTokens = await RefreshToken.query().where('selector', validSelector)
    assert.equal(validTokens.length, 1)
  })
})
