export const AUTH_ERROR_CODE = {
  InvalidCredentials: 'E_INVALID_CREDENTIALS',
  EmailNotVerified: 'E_EMAIL_NOT_VERIFIED',
  InvalidRefreshToken: 'E_INVALID_REFRESH_TOKEN',
  RefreshTokenExpired: 'E_REFRESH_TOKEN_EXPIRED',
  InvalidVerificationToken: 'E_INVALID_VERIFICATION_TOKEN',
  VerificationTokenExpired: 'E_VERIFICATION_TOKEN_EXPIRED',
  Unauthorized: 'E_UNAUTHORIZED',
} as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE]
