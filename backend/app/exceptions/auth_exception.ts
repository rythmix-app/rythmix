import { AUTH_ERROR_CODE, type AuthErrorCode } from '#enums/auth_error_code'

export class AuthException extends Error {
  readonly code: AuthErrorCode
  readonly statusCode: number

  constructor(code: AuthErrorCode, message: string, statusCode: number) {
    super(message)
    this.name = 'AuthException'
    this.code = code
    this.statusCode = statusCode
  }

  static invalidCredentials(): AuthException {
    return new AuthException(AUTH_ERROR_CODE.InvalidCredentials, 'Invalid credentials', 401)
  }

  static emailNotVerified(): AuthException {
    return new AuthException(AUTH_ERROR_CODE.EmailNotVerified, 'Email not verified', 403)
  }

  static invalidRefreshToken(): AuthException {
    return new AuthException(AUTH_ERROR_CODE.InvalidRefreshToken, 'Invalid refresh token', 401)
  }

  static refreshTokenExpired(): AuthException {
    return new AuthException(AUTH_ERROR_CODE.RefreshTokenExpired, 'Refresh token expired', 401)
  }

  static invalidVerificationToken(): AuthException {
    return new AuthException(
      AUTH_ERROR_CODE.InvalidVerificationToken,
      'Invalid verification token',
      400
    )
  }

  static verificationTokenExpired(): AuthException {
    return new AuthException(
      AUTH_ERROR_CODE.VerificationTokenExpired,
      'Verification token expired',
      400
    )
  }

  static unauthorized(): AuthException {
    return new AuthException(AUTH_ERROR_CODE.Unauthorized, 'Unauthorized access', 401)
  }

  static oauthConfirmationInvalid(): AuthException {
    return new AuthException(
      AUTH_ERROR_CODE.OauthConfirmationInvalid,
      'Invalid OAuth confirmation token',
      400
    )
  }

  static oauthConfirmationExpired(): AuthException {
    return new AuthException(
      AUTH_ERROR_CODE.OauthConfirmationExpired,
      'OAuth confirmation token expired',
      400
    )
  }
}
