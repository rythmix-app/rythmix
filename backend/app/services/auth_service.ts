import User from '#models/user'
import RefreshToken from '#models/refresh_token'
import EmailVerificationToken from '#models/email_verification_token'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import hash from '@adonisjs/core/services/hash'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import AuthSessionCreated from '#events/auth_session_created'

export class AuthService {
  async register(data: {
    email: string
    username: string
    password: string
    firstName?: string
    lastName?: string
    role?: string
  }) {
    const user = await User.create({
      email: data.email,
      username: data.username,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      // edit mail in "admin" for dev mode (back office)
      // role: 'admin',
      role: data.role,
    })

    if (user.isAdmin) {
      user.emailVerifiedAt = DateTime.now()
    } else {
      await this.sendVerificationEmail(user)
    }

    return user
  }

  async loginOrCreateFromGoogle(profile: { email: string; name?: string | null }) {
    const normalizedEmail = profile.email.trim().toLowerCase()
    let user = await User.findBy('email', normalizedEmail)

    if (!user) {
      const parts = (profile.name ?? '').trim().split(/\s+/).filter(Boolean)
      user = await User.create({
        email: normalizedEmail,
        username: await this.generateUniqueUsername(normalizedEmail),
        password: randomBytes(32).toString('hex'),
        firstName: parts[0] ?? null,
        lastName: parts.length > 1 ? parts.slice(1).join(' ') : null,
        role: 'user',
        emailVerifiedAt: DateTime.now(),
      })
    }

    await this.recordSession(user)

    return this.issueTokens(user)
  }

  async login(email: string, password: string) {
    const user = await User.findBy('email', email)

    if (!user) {
      throw new Error('Invalid credentials')
    }

    const isPasswordValid = await hash.verify(user.password, password)

    if (!isPasswordValid) {
      throw new Error('Invalid credentials')
    }

    // make this check optional for dev mode
    // if (!user.emailVerifiedAt) {
    //   throw new Error('Email not verified')
    // }

    if (!user.emailVerifiedAt) {
      throw new Error('Email not verified')
    }

    await this.recordSession(user)

    return this.issueTokens(user)
  }

  private async recordSession(user: User) {
    const previousLastLoginAt = user.lastLoginAt
    user.lastLoginAt = DateTime.now()
    await user.save()

    await AuthSessionCreated.dispatch({
      userId: user.id,
      lastLoginAt: previousLastLoginAt,
      isFirstLogin: previousLastLoginAt === null,
    })
  }

  async refresh(refreshTokenValue: string) {
    const parts = refreshTokenValue.split('.')
    if (parts.length !== 2) {
      throw new Error('Invalid refresh token')
    }

    const [selector, verifier] = parts

    const refreshToken = await RefreshToken.query()
      .where('selector', selector)
      .preload('user')
      .first()

    if (!refreshToken) {
      throw new Error('Invalid refresh token')
    }

    if (refreshToken.expiresAt < DateTime.now()) {
      await refreshToken.delete()
      throw new Error('Refresh token expired')
    }

    const isValid = await hash.verify(refreshToken.tokenHash, verifier)
    if (!isValid) {
      throw new Error('Invalid refresh token')
    }

    const accessToken = await User.accessTokens.create(refreshToken.user, ['*'], {
      expiresIn: '15 minutes',
    })

    return {
      accessToken: accessToken.value!.release(),
    }
  }

  async logout(user: User, accessTokenIdentifier: string, refreshTokenValue?: string) {
    await User.accessTokens.delete(user, accessTokenIdentifier)

    if (refreshTokenValue) {
      const parts = refreshTokenValue.split('.')
      if (parts.length === 2) {
        const [selector] = parts
        await RefreshToken.query().where('selector', selector).delete()
      }
    }
  }

  async sendVerificationEmail(user: User) {
    await EmailVerificationToken.query().where('userId', user.id).delete()

    const selector = randomBytes(32).toString('hex')
    const verifier = randomBytes(32).toString('hex')
    const tokenHash = await hash.make(verifier)

    await EmailVerificationToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    const fullToken = `${selector}.${verifier}`
    const frontendUrl = env.get('FRONTEND_URL')
    const verificationUrl = `${frontendUrl}/api/auth/verify-email?token=${fullToken}`

    await mail.send((message) => {
      message
        .to(user.email)
        .subject('Vérification de votre adresse email - Rythmix')
        .htmlView('emails/verify_email', {
          username: user.username,
          verificationUrl: verificationUrl,
        })
    })
  }

  async verifyEmail(token: string) {
    const parts = token.split('.')
    if (parts.length !== 2) {
      throw new Error('Invalid verification token')
    }

    const [selector, verifier] = parts

    const verificationToken = await EmailVerificationToken.query()
      .where('selector', selector)
      .preload('user')
      .first()

    if (!verificationToken) {
      throw new Error('Invalid verification token')
    }

    if (verificationToken.expiresAt < DateTime.now()) {
      await verificationToken.delete()
      throw new Error('Verification token expired')
    }

    const isValid = await hash.verify(verificationToken.tokenHash, verifier)
    if (!isValid) {
      throw new Error('Invalid verification token')
    }

    const user = verificationToken.user

    user.emailVerifiedAt = DateTime.now()
    await user.save()

    await verificationToken.delete()

    return user
  }

  async resendVerificationEmail(email: string) {
    const user = await User.findBy('email', email)

    if (!user || user.emailVerifiedAt) {
      return null
    }

    await this.sendVerificationEmail(user)

    return user
  }

  async revokeAllRefreshTokens(userId: string) {
    await RefreshToken.query().where('userId', userId).delete()
  }

  async cleanExpiredTokens() {
    await RefreshToken.query().where('expiresAt', '<', DateTime.now().toSQL()).delete()
  }

  private async issueTokens(user: User) {
    const accessToken = await User.accessTokens.create(user, ['*'], {
      expiresIn: '15 minutes',
    })
    const refreshToken = await this.generateRefreshToken(user)

    return {
      user,
      accessToken: accessToken.value!.release(),
      refreshToken: refreshToken.token,
    }
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    const sanitized = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
    const base = sanitized.length >= 3 ? sanitized : `${sanitized}user`
    const candidate = base.slice(0, 50)

    const existing = await User.findBy('username', candidate)
    if (!existing) return candidate

    let username = candidate

    while (await User.findBy('username', username)) {
      username = `${candidate.slice(0, 43)}_${randomBytes(3).toString('hex')}`
    }

    return username
  }

  private async generateRefreshToken(user: User) {
    const selector = randomBytes(32).toString('hex')
    const verifier = randomBytes(32).toString('hex')
    const tokenHash = await hash.make(verifier)

    const refreshToken = await RefreshToken.create({
      userId: user.id,
      selector: selector,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().plus({ days: 7 }),
    })

    return {
      ...refreshToken,
      token: `${selector}.${verifier}`,
    }
  }
}
