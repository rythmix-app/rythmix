import type { HttpContext } from '@adonisjs/core/http'
import { AuthService } from '#services/auth_service'
import {
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resendVerificationValidator,
} from '#validators/auth_validator'
import { errors } from '@vinejs/vine'
import { ApiOperation, ApiResponse, ApiSecurity, ApiBody } from '@foadonis/openapi/decorators'

export default class AuthController {
  private authService: AuthService

  constructor() {
    this.authService = new AuthService()
  }

  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account. An email verification link will be sent to the provided email address. Rate limited to 5 requests per 15 minutes per IP.',
  })
  @ApiBody({
    description: 'User registration data',
    required: true,
    schema: {
      type: 'object',
      required: ['email', 'username', 'password', 'password_confirmation'],
      properties: {
        email: { type: 'string', format: 'email', example: 'john@example.com' },
        username: { type: 'string', minLength: 3, example: 'johndoe' },
        password: { type: 'string', format: 'password', minLength: 8, example: 'SecurePass123!' },
        password_confirmation: { type: 'string', format: 'password', minLength: 8, example: 'SecurePass123!' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async register({ request, response }: HttpContext) {
    try {
      const data = await request.validateUsing(registerValidator)

      const user = await this.authService.register(data)

      return response.created({
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        },
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

  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user and receive access and refresh tokens. Email must be verified. Rate limited to 10 requests per 15 minutes.',
  })
  @ApiBody({
    description: 'Login credentials',
    required: true,
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'john@example.com' },
        password: { type: 'string', format: 'password', example: 'SecurePass123!' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful, returns access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
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

  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate a new access token using a valid refresh token',
  })
  @ApiBody({
    description: 'Refresh token',
    required: true,
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
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

  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate access and refresh tokens. Requires Bearer authentication.',
  })
  @ApiSecurity('bearerAuth')
  @ApiBody({
    description: 'Optional refresh token to invalidate',
    required: false,
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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

  @ApiOperation({
    summary: 'Verify user email',
    description: 'Verify user email address using the token sent via email',
  })
  @ApiBody({
    description: 'Verification token',
    required: true,
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', example: '1a2b3c4d5e6f7g8h9i0j' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
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

  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Resend email verification link. Rate limited to 3 requests per 15 minutes.',
  })
  @ApiBody({
    description: 'User email',
    required: true,
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'john@example.com' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Verification email sent if account exists' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
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

  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Get authenticated user information. Requires Bearer authentication.',
  })
  @ApiSecurity('bearerAuth')
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
