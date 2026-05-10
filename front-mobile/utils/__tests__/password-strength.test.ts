import {
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_STRENGTH,
  evaluatePasswordStrength,
} from "../password-strength";

describe("evaluatePasswordStrength", () => {
  it("returns 0 for an empty password", () => {
    const { strength } = evaluatePasswordStrength("");
    expect(strength).toBe(0);
  });

  it("returns 25 for short passwords below min length", () => {
    const { strength } = evaluatePasswordStrength("ab1");
    expect(strength).toBe(25);
  });

  it("returns 25 when only uppercase letters at min length", () => {
    const { strength } = evaluatePasswordStrength("ABCDEFGH");
    expect(strength).toBe(25);
  });

  it("returns 50 for 8+ chars with lowercase + digits but no uppercase", () => {
    const { strength } = evaluatePasswordStrength("abcdef12");
    expect(strength).toBe(50);
  });

  it("returns 75 when length + lower + upper + digit are all met", () => {
    const { strength } = evaluatePasswordStrength("Abcdef12");
    expect(strength).toBe(75);
  });

  it("returns 100 for 12+ chars with full charset including special", () => {
    const { strength } = evaluatePasswordStrength("Abcdefgh1234!");
    expect(strength).toBe(100);
  });

  it("exposes the minimum length constant", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });

  it("uses 50 as the minimum acceptable strength threshold", () => {
    expect(MIN_PASSWORD_STRENGTH).toBe(50);
    expect(
      evaluatePasswordStrength("abcdef12").strength,
    ).toBeGreaterThanOrEqual(MIN_PASSWORD_STRENGTH);
    expect(evaluatePasswordStrength("ab1").strength).toBeLessThan(
      MIN_PASSWORD_STRENGTH,
    );
  });
});
