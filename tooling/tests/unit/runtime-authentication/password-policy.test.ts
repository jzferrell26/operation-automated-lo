import {
  MINIMUM_PASSWORD_LENGTH,
  PASSWORD_DENYLIST_SIZE,
  PASSWORD_POLICY_REASONS,
  evaluatePassword,
  isPasswordPolicyReason,
} from "@oalo/auth";
import { describe, expect, it } from "vitest";

/**
 * PRD-006a 006A-AC-011. Every D3 rule, its reason code, and the bounds of each.
 */

const CONTEXT = Object.freeze({
  email: "dana.miller@example.test",
  displayName: "Dana Miller",
});

describe("password length", () => {
  it("accepts twelve characters and refuses eleven", () => {
    expect(MINIMUM_PASSWORD_LENGTH).toBe(12);
    expect(evaluatePassword("abcdefghijkl")).toEqual({ acceptable: true });
    expect(evaluatePassword("abcdefghijk")).toEqual({
      acceptable: false,
      reason: "PASSWORD_TOO_SHORT",
    });
  });

  it("accepts one hundred and twenty-eight characters and refuses one hundred and twenty-nine", () => {
    expect(evaluatePassword("q".repeat(128))).toEqual({ acceptable: true });
    expect(evaluatePassword("q".repeat(129))).toEqual({
      acceptable: false,
      reason: "PASSWORD_TOO_LONG",
    });
  });

  it("counts the normalized form, not the typed one", () => {
    // Eleven visible characters written with a combining accent are twelve code units before NFC
    // and eleven after it, so the length rule reads the same number a person would count.
    expect(evaluatePassword("caféabcdef")).toEqual({
      acceptable: false,
      reason: "PASSWORD_TOO_SHORT",
    });
  });
});

describe("no composition rules", () => {
  it("accepts a short phrase with spaces and no digit, symbol, or capital", () => {
    expect(evaluatePassword("open the garage door")).toEqual({ acceptable: true });
  });
});

describe("the personal-fragment rule", () => {
  it("refuses a password containing the email local part", () => {
    expect(evaluatePassword("my dana.miller pass", CONTEXT)).toEqual({
      acceptable: false,
      reason: "PASSWORD_LOOKS_PERSONAL",
    });
  });

  it("refuses a password containing the display name, in any case", () => {
    expect(evaluatePassword("carry DANA MILLER home", CONTEXT)).toEqual({
      acceptable: false,
      reason: "PASSWORD_LOOKS_PERSONAL",
    });
  });

  it("refuses a password containing one part of the display name", () => {
    expect(evaluatePassword("something miller here", CONTEXT)).toEqual({
      acceptable: false,
      reason: "PASSWORD_LOOKS_PERSONAL",
    });
  });

  it("ignores a fragment shorter than four characters", () => {
    // A three-character name would refuse most passwords and teach nobody anything, so the rule
    // stops at four.
    expect(
      evaluatePassword("a bow of ribbon here", { email: "bo@example.test", displayName: "Bo" }),
    ).toEqual({ acceptable: true });
  });

  it("applies nothing when neither the email nor the name is known yet", () => {
    expect(evaluatePassword("a bow of ribbon here")).toEqual({ acceptable: true });
  });
});

describe("the denylist", () => {
  it("carries well over the ten thousand entries D3 asks for", () => {
    expect(PASSWORD_DENYLIST_SIZE).toBeGreaterThanOrEqual(10_000);
  });

  it("refuses a listed password whatever its case", () => {
    expect(evaluatePassword("passwordpassword")).toEqual({
      acceptable: false,
      reason: "PASSWORD_TOO_COMMON",
    });
    expect(evaluatePassword("PasswordPassword")).toEqual({
      acceptable: false,
      reason: "PASSWORD_TOO_COMMON",
    });
    expect(evaluatePassword("QwErTyUiOp12345678")).toEqual({
      acceptable: false,
      reason: "PASSWORD_TOO_COMMON",
    });
  });

  it("refuses a long password built from a common name and a year", () => {
    expect(evaluatePassword("jenniferjennifer")).toEqual({
      acceptable: false,
      reason: "PASSWORD_TOO_COMMON",
    });
  });

  it("accepts a twelve-character passphrase that is not on the list", () => {
    expect(evaluatePassword("rowan quilt bureau")).toEqual({ acceptable: true });
  });
});

describe("reason codes", () => {
  it("names exactly the four D3 reasons", () => {
    expect([...PASSWORD_POLICY_REASONS]).toEqual([
      "PASSWORD_TOO_SHORT",
      "PASSWORD_TOO_LONG",
      "PASSWORD_LOOKS_PERSONAL",
      "PASSWORD_TOO_COMMON",
    ]);
    for (const reason of PASSWORD_POLICY_REASONS) {
      expect(isPasswordPolicyReason(reason)).toBe(true);
    }
    expect(isPasswordPolicyReason("PASSWORD_NEEDS_A_SYMBOL")).toBe(false);
    expect(isPasswordPolicyReason(undefined)).toBe(false);
  });

  it("checks length before anything else, so a short common password reports its length", () => {
    expect(evaluatePassword("password")).toEqual({
      acceptable: false,
      reason: "PASSWORD_TOO_SHORT",
    });
  });
});
