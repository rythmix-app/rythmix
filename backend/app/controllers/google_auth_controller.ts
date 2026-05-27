import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
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

@inject()
export default class GoogleAuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Redirect to Google OAuth consent',
    description:
      'Redirects the user to the Google sign-in consent page. Accepts a `returnUrl` query parameter (mobile deep link) that will be hit after the callback.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  @ApiResponse({ status: 400, description: 'Invalid returnUrl' })
  async redirect({ ally, request, response }: HttpContext) {
    const requestedReturnUrl = request.qs().returnUrl as string | undefined
    if (requestedReturnUrl && !isAllowedReturnUrl(requestedReturnUrl)) {
      return response.badRequest({ message: 'Invalid returnUrl' })
    }
    const returnUrl = requestedReturnUrl ?? defaultOauthReturnUrl()
    const state = encodeOauthState(OauthProvider.GOOGLE, returnUrl)

    const url = await ally
      .use('google')
      .stateless()
      .redirectUrl((req) => {
        req.param('state', state)
      })

    return response.redirect(url)
  }

  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles the Google OAuth callback and redirects the mobile app via deep link with status / tokens / pending-confirmation params.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to the mobile deep-link' })
  async callback({ ally, request, response }: HttpContext) {
    const decoded = decodeOauthState(request.qs().state as string | undefined, OauthProvider.GOOGLE)
    const returnUrl = decoded?.returnUrl ?? defaultOauthReturnUrl()

    const google = ally.use('google').stateless()

    if (google.accessDenied()) {
      return response.redirect(
        buildOauthRedirectUrl(returnUrl, {
          status: 'error',
          provider: OauthProvider.GOOGLE,
          reason: 'oauth_denied',
        })
      )
    }

    if (google.hasError()) {
      return response.redirect(
        buildOauthRedirectUrl(returnUrl, {
          status: 'error',
          provider: OauthProvider.GOOGLE,
          reason: 'oauth_error',
        })
      )
    }

    try {
      const googleUser = await google.user()

      if (!googleUser.email) {
        return response.redirect(
          buildOauthRedirectUrl(returnUrl, {
            status: 'error',
            provider: OauthProvider.GOOGLE,
            reason: 'oauth_no_email',
          })
        )
      }

      const result = await this.authService.loginOrCreateFromGoogle({
        email: googleUser.email,
        providerUserId: String(googleUser.id),
        name: googleUser.name,
        returnUrl,
      })

      if (result.status === 'logged_in') {
        return response.redirect(
          buildOauthRedirectUrl(returnUrl, {
            status: 'ok',
            provider: OauthProvider.GOOGLE,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          })
        )
      }

      return response.redirect(
        buildOauthRedirectUrl(returnUrl, {
          status: 'pending_confirmation',
          provider: OauthProvider.GOOGLE,
          email: result.email,
        })
      )
    } catch (error: unknown) {
      logger.error({ err: error }, 'Google OAuth callback failed')
      return response.redirect(
        buildOauthRedirectUrl(returnUrl, {
          status: 'error',
          provider: OauthProvider.GOOGLE,
          reason: 'oauth_error',
        })
      )
    }
  }
}
