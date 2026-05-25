export const AUTH_ERROR_CODE = {
  InvalidCredentials: "E_INVALID_CREDENTIALS",
  EmailNotVerified: "E_EMAIL_NOT_VERIFIED",
  InvalidRefreshToken: "E_INVALID_REFRESH_TOKEN",
  RefreshTokenExpired: "E_REFRESH_TOKEN_EXPIRED",
  InvalidVerificationToken: "E_INVALID_VERIFICATION_TOKEN",
  VerificationTokenExpired: "E_VERIFICATION_TOKEN_EXPIRED",
  Unauthorized: "E_UNAUTHORIZED",
  NoRefreshToken: "E_NO_REFRESH_TOKEN",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE];

const ERROR_MESSAGES: Record<string, string> = {
  [AUTH_ERROR_CODE.InvalidCredentials]: "Email ou mot de passe incorrect.",
  [AUTH_ERROR_CODE.EmailNotVerified]:
    "Votre adresse email n'est pas encore vérifiée.",
  [AUTH_ERROR_CODE.InvalidRefreshToken]:
    "Votre session est invalide. Merci de vous reconnecter.",
  [AUTH_ERROR_CODE.RefreshTokenExpired]:
    "Votre session a expiré. Merci de vous reconnecter.",
  [AUTH_ERROR_CODE.InvalidVerificationToken]:
    "Ce lien de vérification est invalide.",
  [AUTH_ERROR_CODE.VerificationTokenExpired]:
    "Ce lien de vérification a expiré. Demandez un nouveau mail.",
  [AUTH_ERROR_CODE.Unauthorized]:
    "Vous devez être connecté pour effectuer cette action.",
  [AUTH_ERROR_CODE.NoRefreshToken]:
    "Aucune session active. Merci de vous reconnecter.",
};

export function getErrorMessage(code?: string): string | undefined {
  if (!code) return undefined;
  return ERROR_MESSAGES[code];
}
