import type { HttpContext } from '@adonisjs/core/http'
import { AuthService } from '#services/auth_service'
import {
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resendVerificationValidator,
} from '#validators/auth_validator'
import { errors } from '@vinejs/vine'

export default class AuthController {
  private authService: AuthService

  constructor() {
    this.authService = new AuthService()
  }

  async register({ request, response }: HttpContext) {
    try {
      const data = await request.validateUsing(registerValidator)

      const user = await this.authService.register(data)

      const { accessToken, refreshToken } = await this.authService.login(user.email, user.password)

      return response.created({
        accessToken,
        refreshToken,
      })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      return response.internalServerError({
        message: 'An error occurred during registration',
      })
    }
  }

  async login({ request, response }: HttpContext) {
    try {
      const { email, password } = await request.validateUsing(loginValidator)

      const { accessToken, refreshToken } = await this.authService.login(email, password)

      return response.ok({
        accessToken,
        refreshToken,
      })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      if (error instanceof Error && error.message === 'Invalid credentials') {
        return response.unauthorized({
          message: 'Invalid credentials',
        })
      }

      if (error instanceof Error && error.message === 'Email not verified') {
        return response.forbidden({
          message: 'Please verify your email before logging in',
        })
      }

      return response.internalServerError({
        message: 'An error occurred during login',
      })
    }
  }

  async refresh({ request, response }: HttpContext) {
    try {
      const { refreshToken } = await request.validateUsing(refreshTokenValidator)

      const { accessToken } = await this.authService.refresh(refreshToken)

      return response.ok({
        accessToken,
      })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      if (
        error instanceof Error &&
        (error.message === 'Invalid refresh token' || error.message === 'Refresh token expired')
      ) {
        return response.unauthorized({
          message: error.message,
        })
      }

      return response.internalServerError({
        message: 'An error occurred during token refresh',
      })
    }
  }

  async logout({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { refreshToken } = request.only(['refreshToken'])

      const accessToken = auth.user?.currentAccessToken
      if (!accessToken) {
        return response.unauthorized({
          message: 'No active access token found',
        })
      }

      await this.authService.logout(user, String(accessToken.identifier), refreshToken)

      return response.ok({
        message: 'Logout successful',
      })
    } catch (error: unknown) {
      return response.internalServerError({
        message: 'An error occurred during logout',
      })
    }
  }

  async verifyEmail({ request, response }: HttpContext) {
    try {
      const token = request.input('token')

      if (!token) {
        return response.badRequest({
          message: 'Verification token is required',
        })
      }

      const user = await this.authService.verifyEmail(token)

      return response.ok({
        user: {
          id: user.id,
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      })
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Invalid verification token') {
        return response.badRequest({
          message: 'Invalid verification token',
        })
      }

      if (error instanceof Error && error.message === 'Verification token expired') {
        return response.badRequest({
          message: 'Verification token expired. Please request a new one.',
        })
      }

      return response.internalServerError({
        message: 'An error occurred during email verification',
      })
    }
  }

  async resendVerificationEmail({ request, response }: HttpContext) {
    try {
      const { email } = await request.validateUsing(resendVerificationValidator)

      await this.authService.resendVerificationEmail(email)

      return response.ok({
        message: 'If the email exists and is not verified, a verification email has been sent',
      })
    } catch (error: unknown) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          message: 'Validation failed',
          errors: error.messages,
        })
      }

      return response.internalServerError({
        message: 'An error occurred while sending verification email',
      })
    }
  }

  async me({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      return response.ok({
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
          },
        },
      })
    } catch (error: unknown) {
      return response.unauthorized({
        message: 'Unauthorized',
      })
    }
  }
}
