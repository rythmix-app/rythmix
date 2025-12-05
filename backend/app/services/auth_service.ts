import User from '#models/user'
import RefreshToken from '#models/refresh_token'
import EmailVerificationToken from '#models/email_verification_token'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import hash from '@adonisjs/core/services/hash'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'

export class AuthService {
  async register(data: {
    email: string
    username: string
    password: string
    firstName?: string
    lastName?: string
  }) {
    const user = await User.create({
      email: data.email,
      username: data.username,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'admin',
      emailVerifiedAt: DateTime.now(),
    })

    return user
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

    if (!user.emailVerifiedAt) {
      throw new Error('Email not verified')
    }

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
}
