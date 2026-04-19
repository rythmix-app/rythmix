import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import encryption from '@adonisjs/core/services/encryption'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import { SpotifyService } from '#services/spotify_service'
import { ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import { spotifyInitValidator } from '#validators/spotify_validator'

interface SpotifyState {
  userId: string
  returnUrl: string
  expiresAt: string
}

const STATE_TTL_MINUTES = 10
const ALLOWED_RETURN_URL_SCHEMES = ['frontmobile', 'exp', 'exp+frontmobile']
const MAX_RETURN_URL_LENGTH = 500

@inject()
export default class SpotifyAuthController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @ApiOperation({
    summary: 'Initiate Spotify OAuth flow',
    description:
      'Returns a Spotify authorization URL that the mobile client opens in a WebBrowser. The Rythmix identity is taken from the Authorization header — never from the query string — so the token is not leaked to logs, proxies or browser history.',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'Authorization URL returned' })
  @ApiResponse({ status: 400, description: 'Invalid returnUrl' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async init({ ally, auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { returnUrl } = await request.validateUsing(spotifyInitValidator)

    if (!this.isAllowedReturnUrl(returnUrl)) {
      return response.badRequest({ message: 'Invalid returnUrl' })
    }

    const state = this.encodeState(user.id, returnUrl)

    const authorizeUrl = await ally
      .use('spotify')
      .stateless()
      .redirectUrl((req) => {
        req.param('state', state)
      })

    return response.ok({ authorizeUrl })
  }

  @ApiOperation({
    summary: 'Spotify OAuth callback',
    description:
      'Handles the Spotify redirect, exchanges the code and upserts the UserIntegration. Finishes with an HTTP 302 to the mobile deep-link URL provided at redirect time.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to the mobile deep-link' })
  async callback({ ally, request, response }: HttpContext) {
    const fallbackUrl = this.buildFallbackUrl()
    const spotify = ally.use('spotify').stateless()

    const stateRaw = request.qs().state as string | undefined
    const decoded = stateRaw ? this.decodeState(stateRaw) : null

    if (spotify.accessDenied()) {
      return response.redirect(
        this.appendStatus(decoded?.returnUrl ?? fallbackUrl, 'error', 'access_denied')
      )
    }

    if (!decoded) {
      return response.redirect(this.appendStatus(fallbackUrl, 'error', 'invalid_state'))
    }

    try {
      const token = await spotify.accessToken()
      logger.info(
        { scope: (token as { scope?: string }).scope, expiresIn: token.expiresIn },
        'Spotify access token obtained'
      )

      const meResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token.token}` },
      })

      if (!meResponse.ok) {
        const rawBody = await meResponse.text()
        logger.error(
          {
            status: meResponse.status,
            body: rawBody,
            scope: (token as { scope?: string }).scope,
          },
          'Spotify /v1/me returned non-2xx'
        )
        return response.redirect(
          this.appendStatus(decoded.returnUrl, 'error', `spotify_me_${meResponse.status}`)
        )
      }

      const me = (await meResponse.json()) as { id?: string }
      if (!me.id) {
        return response.redirect(this.appendStatus(decoded.returnUrl, 'error', 'spotify_me_no_id'))
      }

      await this.spotifyService.upsertIntegration(decoded.userId, {
        providerUserId: me.id,
        accessToken: token.token,
        refreshToken: token.refreshToken ?? null,
        expiresAt: token.expiresIn
          ? DateTime.now().plus({ seconds: token.expiresIn })
          : token.expiresAt
            ? DateTime.fromJSDate(token.expiresAt)
            : null,
        scopes: this.extractScopes(token as Record<string, unknown>),
      })

      return response.redirect(this.appendStatus(decoded.returnUrl, 'ok'))
    } catch (error) {
      logger.error({ err: error, qs: request.qs() }, 'Spotify callback failed')
      const reason = error instanceof Error ? error.message.slice(0, 120) : 'unknown_error'
      return response.redirect(this.appendStatus(decoded.returnUrl, 'error', reason))
    }
  }

  private isAllowedReturnUrl(url: string): boolean {
    if (url.length > MAX_RETURN_URL_LENGTH) return false
    const schemeMatch = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//)
    if (!schemeMatch) return false
    return ALLOWED_RETURN_URL_SCHEMES.includes(schemeMatch[1])
  }

  private buildFallbackUrl(): string {
    const scheme = env.get('SPOTIFY_DEEP_LINK_SCHEME', 'frontmobile')
    return `${scheme}://spotify-linked`
  }

  private appendStatus(url: string, status: 'ok' | 'error', reason?: string): string {
    const separator = url.includes('?') ? '&' : '?'
    const params = new URLSearchParams({ status })
    if (reason) params.set('reason', reason)
    return `${url}${separator}${params.toString()}`
  }

  private extractScopes(token: Record<string, unknown>): string | null {
    const rawScope = (token.scope ??
      (token as { original?: { scope?: string } }).original?.scope) as string | string[] | undefined
    if (!rawScope) return null
    return Array.isArray(rawScope) ? rawScope.join(' ') : rawScope
  }

  private encodeState(userId: string, returnUrl: string): string {
    const payload: SpotifyState = {
      userId,
      returnUrl,
      expiresAt: DateTime.now().plus({ minutes: STATE_TTL_MINUTES }).toISO()!,
    }
    return encryption.encrypt(payload)
  }

  private decodeState(state: string): { userId: string; returnUrl: string } | null {
    const payload = encryption.decrypt<SpotifyState>(state)
    if (!payload) return null
    const expiresAt = DateTime.fromISO(payload.expiresAt)
    if (!expiresAt.isValid || expiresAt <= DateTime.now()) return null
    if (!this.isAllowedReturnUrl(payload.returnUrl)) return null
    return { userId: payload.userId, returnUrl: payload.returnUrl }
  }
}
