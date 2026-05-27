import User from '#models/user'
import RefreshToken from '#models/refresh_token'
import EmailVerificationToken from '#models/email_verification_token'
import OAuthLinkConfirmationToken, {
  type OAuthSpotifyPayload,
} from '#models/oauth_link_confirmation_token'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import hash from '@adonisjs/core/services/hash'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import AuthSessionCreated from '#events/auth_session_created'
import { AuthException } from '#exceptions/auth_exception'
import { OauthProvider } from '#enums/oauth_provider'
import { SpotifyService } from '#services/spotify_service'

const OAUTH_LINK_CONFIRMATION_TTL_HOURS = 1

export interface SpotifyOauthProfile {
  email: string
  providerUserId: string
  displayName: string | null
  accessToken: string
  refreshToken: string | null
  expiresAt: DateTime | null
  scopes: string | null
  returnUrl?: string | null
}

export interface GoogleOauthProfile {
  email: string
  providerUserId: string
  name?: string | null
  returnUrl?: string | null
}

export type OauthLoginResult =
  | { status: 'logged_in'; user: User; accessToken: string; refreshToken: string }
  | { status: 'pending_confirmation'; email: string; provider: OauthProvider }

export class AuthService {
  constructor(private readonly spotifyService: SpotifyService = new SpotifyService()) {}

  async register(data: {
    email: string
    username: string
    password: string
    firstName?: string
    lastName?: string
    role?: string
    optInNewsletter?: boolean
    verifyDeepLinkUrl?: string
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
      optInNewsletter: data.optInNewsletter ?? false,
    })

    if (user.isAdmin) {
      user.emailVerifiedAt = DateTime.now()
    } else {
      await this.sendVerificationEmail(user, data.verifyDeepLinkUrl)
    }

    return user
  }

  async loginOrCreateFromGoogle(profile: GoogleOauthProfile): Promise<OauthLoginResult> {
    const normalizedEmail = profile.email.trim().toLowerCase()
    const existing = await User.findBy('email', normalizedEmail)

    if (!existing) {
      const parts = (profile.name ?? '').trim().split(/\s+/).filter(Boolean)
      const user = await User.create({
        email: normalizedEmail,
        username: await this.generateUniqueUsername(normalizedEmail),
        password: randomBytes(32).toString('hex'),
        firstName: parts[0] ?? null,
        lastName: parts.length > 1 ? parts.slice(1).join(' ') : null,
        role: 'user',
        emailVerifiedAt: DateTime.now(),
        googleId: profile.providerUserId,
      })

      await this.recordSession(user)
      return { status: 'logged_in', ...(await this.issueTokens(user)) }
    }

    if (existing.googleId === profile.providerUserId) {
      await this.recordSession(existing)
      return { status: 'logged_in', ...(await this.issueTokens(existing)) }
    }

    await this.startOAuthLinkConfirmation(
      existing,
      OauthProvider.GOOGLE,
      profile.providerUserId,
      null,
      profile.returnUrl
    )
    return { status: 'pending_confirmation', email: existing.email, provider: OauthProvider.GOOGLE }
  }

  async loginOrCreateFromSpotify(profile: SpotifyOauthProfile): Promise<OauthLoginResult> {
    const normalizedEmail = profile.email.trim().toLowerCase()
    const existing = await User.findBy('email', normalizedEmail)

    if (!existing) {
      const user = await User.create({
        email: normalizedEmail,
        username: await this.generateUniqueUsernameFromDisplayName(
          profile.displayName,
          normalizedEmail
        ),
        password: randomBytes(32).toString('hex'),
        role: 'user',
        emailVerifiedAt: DateTime.now(),
        spotifyId: profile.providerUserId,
      })

      await this.spotifyService.upsertIntegration(user.id, {
        providerUserId: profile.providerUserId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        expiresAt: profile.expiresAt,
        scopes: profile.scopes,
      })
      await this.recordSession(user)
      return { status: 'logged_in', ...(await this.issueTokens(user)) }
    }

    if (existing.spotifyId === profile.providerUserId) {
      await this.spotifyService.upsertIntegration(existing.id, {
        providerUserId: profile.providerUserId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        expiresAt: profile.expiresAt,
        scopes: profile.scopes,
      })
      await this.recordSession(existing)
      return { status: 'logged_in', ...(await this.issueTokens(existing)) }
    }

    await this.startOAuthLinkConfirmation(
      existing,
      OauthProvider.SPOTIFY,
      profile.providerUserId,
      {
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        expiresAt: profile.expiresAt ? profile.expiresAt.toISO() : null,
        scopes: profile.scopes,
      },
      profile.returnUrl
    )
    return {
      status: 'pending_confirmation',
      email: existing.email,
      provider: OauthProvider.SPOTIFY,
    }
  }

  async confirmOAuthLink(token: string): Promise<{
    user: User
    accessToken: string
    refreshToken: string
    provider: OauthProvider
  }> {
    const parts = token.split('.')
    if (parts.length !== 2) {
      throw AuthException.oauthConfirmationInvalid()
    }

    const [selector, verifier] = parts

    const confirmation = await OAuthLinkConfirmationToken.query()
      .where('selector', selector)
      .preload('user')
      .first()

    if (!confirmation) {
      throw AuthException.oauthConfirmationInvalid()
    }

    if (confirmation.expiresAt < DateTime.now()) {
      await confirmation.delete()
      throw AuthException.oauthConfirmationExpired()
    }

    const isValid = await hash.verify(confirmation.tokenHash, verifier)
    if (!isValid) {
      throw AuthException.oauthConfirmationInvalid()
    }

    const user = confirmation.user

    if (confirmation.provider === OauthProvider.GOOGLE) {
      user.googleId = confirmation.providerUserId
    } else {
      user.spotifyId = confirmation.providerUserId
      const payload = confirmation.providerPayload
      if (payload) {
        await this.spotifyService.upsertIntegration(user.id, {
          providerUserId: confirmation.providerUserId,
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          expiresAt: payload.expiresAt ? DateTime.fromISO(payload.expiresAt) : null,
          scopes: payload.scopes,
        })
      }
    }
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = DateTime.now()
    }
    await user.save()

    await OAuthLinkConfirmationToken.query()
      .where('userId', user.id)
      .where('provider', confirmation.provider)
      .delete()
    await this.recordSession(user)
    const tokens = await this.issueTokens(user)

    return {
      user: tokens.user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      provider: confirmation.provider,
    }
  }

  async login(email: string, password: string) {
    const user = await User.findBy('email', email)

    if (!user) {
      throw AuthException.invalidCredentials()
    }

    const isPasswordValid = await hash.verify(user.password, password)

    if (!isPasswordValid) {
      throw AuthException.invalidCredentials()
    }

    if (!user.emailVerifiedAt) {
      throw AuthException.emailNotVerified()
    }

    await this.recordSession(user)

    return this.issueTokens(user)
  }

  private async recordSession(user: User) {
    const previousLastLoginAt = user.lastLoginAt ?? null
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
      throw AuthException.invalidRefreshToken()
    }

    const [selector, verifier] = parts

    const refreshToken = await RefreshToken.query()
      .where('selector', selector)
      .preload('user')
      .first()

    if (!refreshToken) {
      throw AuthException.invalidRefreshToken()
    }

    if (refreshToken.expiresAt < DateTime.now()) {
      await refreshToken.delete()
      throw AuthException.refreshTokenExpired()
    }

    const isValid = await hash.verify(refreshToken.tokenHash, verifier)
    if (!isValid) {
      throw AuthException.invalidRefreshToken()
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

  async sendVerificationEmail(user: User, deepLinkUrl?: string) {
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
    let verificationUrl = `${frontendUrl}/api/auth/verify-email?token=${fullToken}`
    if (deepLinkUrl) {
      verificationUrl += `&return=${encodeURIComponent(deepLinkUrl)}`
    }

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
      throw AuthException.invalidVerificationToken()
    }

    const [selector, verifier] = parts

    const verificationToken = await EmailVerificationToken.query()
      .where('selector', selector)
      .preload('user')
      .first()

    if (!verificationToken) {
      throw AuthException.invalidVerificationToken()
    }

    if (verificationToken.expiresAt < DateTime.now()) {
      await verificationToken.delete()
      throw AuthException.verificationTokenExpired()
    }

    const isValid = await hash.verify(verificationToken.tokenHash, verifier)
    if (!isValid) {
      throw AuthException.invalidVerificationToken()
    }

    const user = verificationToken.user

    user.emailVerifiedAt = DateTime.now()
    await user.save()

    await verificationToken.delete()

    return user
  }

  async resendVerificationEmail(email: string, deepLinkUrl?: string) {
    const user = await User.findBy('email', email)

    if (!user || user.emailVerifiedAt) {
      return null
    }

    await this.sendVerificationEmail(user, deepLinkUrl)

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

  private async startOAuthLinkConfirmation(
    user: User,
    provider: OauthProvider,
    providerUserId: string,
    payload: OAuthSpotifyPayload | null = null,
    returnUrl: string | null | undefined = null
  ) {
    await OAuthLinkConfirmationToken.query()
      .where('userId', user.id)
      .where('provider', provider)
      .delete()

    const selector = randomBytes(32).toString('hex')
    const verifier = randomBytes(32).toString('hex')
    const tokenHash = await hash.make(verifier)

    await OAuthLinkConfirmationToken.create({
      userId: user.id,
      provider,
      providerUserId,
      providerPayload: payload,
      selector,
      tokenHash,
      expiresAt: DateTime.now().plus({ hours: OAUTH_LINK_CONFIRMATION_TTL_HOURS }),
    })

    await this.sendOAuthLinkConfirmationEmail(user, provider, selector, verifier, returnUrl)
  }

  private async sendOAuthLinkConfirmationEmail(
    user: User,
    provider: OauthProvider,
    selector: string,
    verifier: string,
    returnUrl: string | null | undefined = null
  ) {
    const fullToken = `${selector}.${verifier}`
    const frontendUrl = env.get('FRONTEND_URL')
    const params = new URLSearchParams({ token: fullToken })
    if (returnUrl) {
      params.set('return', returnUrl)
    }
    const confirmationUrl = `${frontendUrl}/api/auth/oauth/confirm?${params.toString()}`
    const providerLabel = provider === OauthProvider.GOOGLE ? 'Google' : 'Spotify'
    const buttonColor = provider === OauthProvider.GOOGLE ? '#4285F4' : '#1DB954'

    await mail.send((message) => {
      message
        .to(user.email)
        .subject(`Confirme la liaison de ton compte ${providerLabel} - Rythmix`)
        .htmlView('emails/confirm_oauth_link', {
          username: user.username,
          provider: providerLabel,
          buttonColor,
          confirmationUrl,
        })
    })
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

  private async generateUniqueUsernameFromDisplayName(
    displayName: string | null | undefined,
    email: string
  ): Promise<string> {
    const sanitized = (displayName ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (sanitized.length < 3) {
      return this.generateUniqueUsername(email)
    }
    const candidate = sanitized.slice(0, 50)

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
