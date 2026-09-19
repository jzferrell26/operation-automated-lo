import { argon2Sync, scryptSync } from "node:crypto";

import {
  ARGON2ID_PARAMETERS,
  DUMMY_PASSWORD_HASH,
  MAXIMUM_PASSWORD_LENGTH,
  PasswordHashError,
  hashPassword,
  isStoredPasswordHash,
  normalizePassword,
  passwordNeedsRehash,
  verifyPassword,
} from "@oalo/auth";
import { describe, expect, it } from "vitest";

/**
 * PRD-006a 006A-AC-010. The derivation module: its round trip, its refusals, the constants the
 * decision in D2 settled on, and the dummy hash the unknown-email path derives against.
 */

const PASSWORD = "a passphrase for the tests";

describe("password hashing parameters", () => {
  /**
   * D2 requires a unit test that pins the constants so a silent change fails. These numbers are
   * the OWASP Argon2id baseline, and raising them is a decision with a measured cost, not an edit.
   */
  it("pins the Argon2id parameters the decision in D2 chose", () => {
    expect(ARGON2ID_PARAMETERS).toEqual({
      algorithm: "argon2id",
      memoryKibibytes: 19_456,
      passes: 2,
      parallelism: 1,
      tagLengthBytes: 32,
      saltLengthBytes: 16,
    });
    expect(MAXIMUM_PASSWORD_LENGTH).toBe(128);
  });

  it("derives Argon2id, because the pinned runtime exposes it", () => {
    // The decision in D2 turns on this being available on Node 24.18.0. If a runtime ever loses
    // it, this case fails here rather than at somebody's sign-in.
    expect(typeof argon2Sync).toBe("function");
    expect(hashPassword(PASSWORD).startsWith("$argon2id$v=19$m=19456,t=2,p=1$")).toBe(true);
  });
});

describe("hashPassword and verifyPassword", () => {
  it("round trips the password it was given", () => {
    const stored = hashPassword(PASSWORD);

    expect(verifyPassword(stored, PASSWORD)).toBe(true);
  });

  it("refuses a wrong password of the same length", () => {
    const stored = hashPassword(PASSWORD);

    expect(verifyPassword(stored, "a passphrase for the tesTs")).toBe(false);
  });

  it("salts every hash, so the same password stores differently twice", () => {
    expect(hashPassword(PASSWORD)).not.toBe(hashPassword(PASSWORD));
  });

  it("treats the two Unicode spellings of the same visible text as one password", () => {
    const composed = "passe\u00e9phrase pour toi";
    const decomposed = "passee\u0301phrase pour toi";
    expect(composed).not.toBe(decomposed);
    expect(normalizePassword(decomposed)).toBe(normalizePassword(composed));

    expect(verifyPassword(hashPassword(composed), decomposed)).toBe(true);
  });

  it("keeps a leading or trailing space as part of the password", () => {
    const stored = hashPassword(` ${PASSWORD} `);

    expect(verifyPassword(stored, PASSWORD)).toBe(false);
    expect(verifyPassword(stored, ` ${PASSWORD} `)).toBe(true);
  });

  it("refuses to verify a string outside the stored shape rather than throwing", () => {
    expect(verifyPassword("", PASSWORD)).toBe(false);
    expect(verifyPassword("plaintext", "plaintext")).toBe(false);
    expect(verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$short$short", PASSWORD)).toBe(false);
    expect(verifyPassword("$md5$deadbeef", PASSWORD)).toBe(false);
  });

  it("refuses to derive an empty or over-long password", () => {
    expect(() => hashPassword("")).toThrow(PasswordHashError);
    expect(() => hashPassword("x".repeat(MAXIMUM_PASSWORD_LENGTH + 1))).toThrow(PasswordHashError);
    expect(() => hashPassword("x".repeat(MAXIMUM_PASSWORD_LENGTH))).not.toThrow();
  });

  it("never puts the password in the error it throws", () => {
    let message = "";
    try {
      hashPassword("");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).not.toContain(PASSWORD);
    expect(message).toContain("128");
  });
});

describe("reading a scrypt hash", () => {
  /**
   * Nothing in this product writes a scrypt hash. The shape stays readable so a hash written by
   * an older or a fallback derivation verifies instead of locking a person out.
   */
  it("verifies a scrypt string written by the OWASP-minimum parameters", () => {
    const salt = Buffer.alloc(16, 0x11);
    const derived = scryptSync(Buffer.from(PASSWORD, "utf8"), salt, 64, {
      N: 2 ** 17,
      r: 8,
      p: 1,
      maxmem: 256 * 1024 * 1024,
    });
    const stored = [
      "",
      "scrypt",
      "ln=17,r=8,p=1",
      salt.toString("base64").replace(/=+$/u, ""),
      derived.toString("base64").replace(/=+$/u, ""),
    ].join("$");

    expect(isStoredPasswordHash(stored)).toBe(true);
    expect(verifyPassword(stored, PASSWORD)).toBe(true);
    expect(verifyPassword(stored, "something else entirely")).toBe(false);
  });
});

describe("passwordNeedsRehash", () => {
  it("says no for a hash this module just wrote", () => {
    expect(passwordNeedsRehash(hashPassword(PASSWORD))).toBe(false);
  });

  it("says yes for another algorithm or weaker parameters", () => {
    expect(
      passwordNeedsRehash("$scrypt$ln=17,r=8,p=1$" + "A".repeat(22) + "$" + "B".repeat(86)),
    ).toBe(true);
    expect(
      passwordNeedsRehash(
        "$argon2id$v=19$m=15360,t=2,p=1$" + "A".repeat(22) + "$" + "B".repeat(43),
      ),
    ).toBe(true);
    expect(passwordNeedsRehash("not a hash at all")).toBe(true);
  });
});

describe("the dummy hash", () => {
  it("is a real stored hash that no password verifies against", () => {
    expect(isStoredPasswordHash(DUMMY_PASSWORD_HASH)).toBe(true);
    expect(DUMMY_PASSWORD_HASH.startsWith("$argon2id$v=19$m=19456,t=2,p=1$")).toBe(true);
    expect(verifyPassword(DUMMY_PASSWORD_HASH, PASSWORD)).toBe(false);
    expect(verifyPassword(DUMMY_PASSWORD_HASH, "")).toBe(false);
  });

  it("costs the same one derivation a wrong password costs", () => {
    // Both paths run exactly one Argon2id derivation, which is what makes the unknown-email and
    // wrong-password answers indistinguishable in time. The route-level suite proves the handler
    // takes that path; this case proves the shape it takes is the same one.
    expect(passwordNeedsRehash(DUMMY_PASSWORD_HASH)).toBe(false);
  });
});
