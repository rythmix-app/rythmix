export interface PasswordCriteria {
  length: boolean;
  lengthStrong: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

export interface PasswordStrengthResult {
  strength: 0 | 25 | 50 | 75 | 100;
  criteria: PasswordCriteria;
}

export const MIN_PASSWORD_LENGTH = 8;
export const MIN_PASSWORD_STRENGTH = 50;

export const evaluatePasswordStrength = (
  password: string,
): PasswordStrengthResult => {
  const criteria: PasswordCriteria = {
    length: password.length >= MIN_PASSWORD_LENGTH,
    lengthStrong: password.length >= 12,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/`~]/.test(password),
  };

  if (!password) {
    return { strength: 0, criteria };
  }

  if (
    criteria.lengthStrong &&
    criteria.lowercase &&
    criteria.uppercase &&
    criteria.number &&
    criteria.special
  ) {
    return { strength: 100, criteria };
  }

  if (
    criteria.length &&
    criteria.lowercase &&
    criteria.uppercase &&
    criteria.number
  ) {
    return { strength: 75, criteria };
  }

  if (
    criteria.length &&
    criteria.lowercase &&
    (criteria.uppercase || criteria.number) &&
    !(criteria.uppercase && criteria.number)
  ) {
    return { strength: 50, criteria };
  }

  return { strength: 25, criteria };
};
