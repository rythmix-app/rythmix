export const AUTH_ERROR_CODE = {
  InvalidCredentials: 'E_INVALID_CREDENTIALS',
  EmailNotVerified: 'E_EMAIL_NOT_VERIFIED',
  InvalidRefreshToken: 'E_INVALID_REFRESH_TOKEN',
  RefreshTokenExpired: 'E_REFRESH_TOKEN_EXPIRED',
  InvalidVerificationToken: 'E_INVALID_VERIFICATION_TOKEN',
  VerificationTokenExpired: 'E_VERIFICATION_TOKEN_EXPIRED',
  Unauthorized: 'E_UNAUTHORIZED',
  OauthDenied: 'E_OAUTH_DENIED',
  OauthError: 'E_OAUTH_ERROR',
  OauthConfirmationInvalid: 'E_OAUTH_CONFIRMATION_INVALID',
  OauthConfirmationExpired: 'E_OAUTH_CONFIRMATION_EXPIRED',
} as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE]
