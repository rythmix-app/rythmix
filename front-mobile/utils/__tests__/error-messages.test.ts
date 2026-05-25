import { AUTH_ERROR_CODE, getErrorMessage } from "../error-messages";

describe("getErrorMessage", () => {
  it("returns the FR message for a known auth code", () => {
    expect(getErrorMessage(AUTH_ERROR_CODE.InvalidCredentials)).toBe(
      "Email ou mot de passe incorrect.",
    );
    expect(getErrorMessage(AUTH_ERROR_CODE.EmailNotVerified)).toBe(
      "Votre adresse email n'est pas encore vérifiée.",
    );
    expect(getErrorMessage(AUTH_ERROR_CODE.RefreshTokenExpired)).toBe(
      "Votre session a expiré. Merci de vous reconnecter.",
    );
  });

  it("returns undefined when the code is unknown", () => {
    expect(getErrorMessage("E_UNKNOWN_CODE")).toBeUndefined();
  });

  it("returns undefined when no code is provided", () => {
    expect(getErrorMessage(undefined)).toBeUndefined();
    expect(getErrorMessage("")).toBeUndefined();
  });
});
