import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { AuthService } from '#services/auth_service'
import {
  buildOauthRedirectUrl,
  decodeOauthState,
  defaultOauthReturnUrl,
  encodeOauthState,
  isAllowedReturnUrl,
} from '#helpers/oauth_redirect'
import { OauthProvider } from '#enums/oauth_provider'

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_ME_URL = 'https://api.spotify.com/v1/me'
const SPOTIFY_LOGIN_SCOPES =
  'user-read-email user-read-private user-top-read user-read-recently-played'

@inject()
export default class SpotifyLoginController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Initiate Spotify login OAuth flow',
    description:
      'Returns a Spotify authorization URL the mobile client opens in WebBrowser. Different from the post-login Spotify linking flow.',
  })
  @ApiResponse({ status: 200, description: 'Authorization URL returned' })
  @ApiResponse({ status: 400, description: 'Invalid returnUrl' })
  async init({ request, response }: HttpContext) {
    const requestedReturnUrl = request.qs().returnUrl as string | undefined
    if (requestedReturnUrl && !isAllowedReturnUrl(requestedReturnUrl)) {
      return response.badRequest({ message: 'Invalid returnUrl' })
    }
    const returnUrl = requestedReturnUrl ?? defaultOauthReturnUrl()
    const state = encodeOauthState(OauthProvider.SPOTIFY, returnUrl)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.get('SPOTIFY_CLIENT_ID'),
      redirect_uri: this.callbackUrl(),
      scope: SPOTIFY_LOGIN_SCOPES,
      state,
    })

    return response.ok({ authorizeUrl: `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}` })
  }

  @ApiOperation({
    summary: 'Spotify login OAuth callback',
    description:
      'Handles the Spotify login redirect, fetches the profile and triggers login or pending-confirmation. Redirects the mobile app via deep link.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to the mobile deep-link' })
  async callback({ request, response }: HttpContext) {
    const qs = request.qs() as { code?: string; state?: string; error?: string }
    const decoded = decodeOauthState(qs.state, OauthProvider.SPOTIFY)
    const returnUrl = decoded?.returnUrl ?? defaultOauthReturnUrl()

    if (qs.error) {
      return response.redirect(
        buildOauthRedirectUrl(returnUrl, {
          status: 'error',
          provider: OauthProvider.SPOTIFY,
          reason: qs.error === 'access_denied' ? 'oauth_denied' : 'oauth_error',
        })
      )
    }

    if (!decoded || !qs.code) {
      return response.redirect(
        buildOauthRedirectUrl(returnUrl, {
          status: 'error',
          provider: OauthProvider.SPOTIFY,
          reason: 'oauth_error',
        })
      )
    }

    try {
      const token = await this.exchangeCode(qs.code)
      const me = await this.fetchSpotifyProfile(token.accessToken)

      if (!me.id || !me.email) {
        return response.redirect(
          buildOauthRedirectUrl(returnUrl, {
            status: 'error',
            provider: OauthProvider.SPOTIFY,
            reason: 'oauth_no_email',
          })
        )
      }

      const result = await this.authService.loginOrCreateFromSpotify({
        email: me.email,
        providerUserId: me.id,
        displayName: me.display_name ?? null,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        scopes: token.scopes,
        returnUrl,
      })

      if (result.status === 'logged_in') {
        return response.redirect(
          buildOauthRedirectUrl(returnUrl, {
            status: 'ok',
            provider: OauthProvider.SPOTIFY,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          })
        )
      }

      return response.redirect(
        buildOauthRedirectUrl(returnUrl, {
          status: 'pending_confirmation',
          provider: OauthProvider.SPOTIFY,
          email: result.email,
        })
      )
    } catch (error: unknown) {
      logger.error({ err: error }, 'Spotify login callback failed')
      return response.redirect(
        buildOauthRedirectUrl(returnUrl, {
          status: 'error',
          provider: OauthProvider.SPOTIFY,
          reason: 'oauth_error',
        })
      )
    }
  }

  private callbackUrl(): string {
    return env.get('SPOTIFY_LOGIN_CALLBACK_URL', '')
  }

  private async exchangeCode(code: string): Promise<{
    accessToken: string
    refreshToken: string | null
    expiresAt: DateTime | null
    scopes: string | null
  }> {
    const basic = Buffer.from(
      `${env.get('SPOTIFY_CLIENT_ID')}:${env.get('SPOTIFY_CLIENT_SECRET')}`
    ).toString('base64')

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.callbackUrl(),
    })

    const res = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!res.ok) {
      throw new Error(`Spotify token exchange failed: ${res.status}`)
    }

    const json = (await res.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      scope?: string
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt: json.expires_in ? DateTime.now().plus({ seconds: json.expires_in }) : null,
      scopes: json.scope ?? null,
    }
  }

  private async fetchSpotifyProfile(accessToken: string): Promise<{
    id?: string
    email?: string
    display_name?: string
  }> {
    const res = await fetch(SPOTIFY_ME_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      throw new Error(`Spotify /v1/me failed: ${res.status}`)
    }

    return (await res.json()) as { id?: string; email?: string; display_name?: string }
  }
}
