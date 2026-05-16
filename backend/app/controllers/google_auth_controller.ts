import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { AuthService } from '#services/auth_service'

@inject()
export default class GoogleAuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Redirect to Google OAuth consent',
    description: 'Redirects the user to the Google sign-in consent page.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  async redirect({ ally, response }: HttpContext) {
    const url = await ally.use('google').stateless().redirectUrl()
    return response.redirect(url)
  }

  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles the Google OAuth callback, creates the user if needed, and returns access and refresh tokens.',
  })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 400, description: 'Google returned an error or no email' })
  @ApiResponse({ status: 401, description: 'User cancelled the Google sign-in' })
  @ApiResponse({ status: 500, description: 'Unexpected failure during token exchange' })
  async callback({ ally, response }: HttpContext) {
    const google = ally.use('google').stateless()

    if (google.accessDenied()) {
      return response.unauthorized({ message: 'Google sign-in was cancelled' })
    }

    if (google.hasError()) {
      return response.badRequest({ message: 'Google sign-in failed' })
    }

    try {
      const googleUser = await google.user()

      if (!googleUser.email) {
        return response.badRequest({ message: 'Google did not return an email' })
      }

      const { accessToken, refreshToken } = await this.authService.loginOrCreateFromGoogle({
        email: googleUser.email,
        name: googleUser.name,
      })

      return response.ok({ accessToken, refreshToken })
    } catch (error: unknown) {
      logger.error({ err: error }, 'Google OAuth callback failed')
      return response.internalServerError({ message: 'Google sign-in failed' })
    }
  }
}
