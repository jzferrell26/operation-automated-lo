import { describe, expect, it, vi } from "vitest";

/**
 * PRD-006a 006A-AC-010 and 006A-AC-013. The unknown-address path and the wrong-password path each
 * cost exactly one derivation.
 *
 * This is the mechanism behind the sign-in page's promise that it reveals nothing: the response
 * bodies are byte-identical (the route-level suite proves that) and the work behind them is
 * identical too (this proves that). A path that skipped the derivation because no credential row
 * existed would answer measurably faster, and the timing would be the oracle the body is not.
 *
 * `node:crypto` is replaced wholesale here, with everything but `argon2Sync` forwarded, because
 * the module under test binds `argon2Sync` at import time and a spy on the namespace would not
 * reach that binding. The file is separate from `password-hash.test.ts` so the mock touches only
 * these cases.
 */

const derivations = { count: 0 };

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    argon2Sync(...parameters: Parameters<typeof actual.argon2Sync>) {
      derivations.count += 1;
      return actual.argon2Sync(...parameters);
    },
  };
});

const { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } = await import("@oalo/auth");

const PASSWORD = "a settled harbour lantern";

describe("derivation count", () => {
  it("counts one derivation for a wrong password and one for the unknown-account path", () => {
    const stored = hashPassword(PASSWORD);

    derivations.count = 0;
    expect(verifyPassword(stored, "a settled harbour lantErn")).toBe(false);
    const wrongPasswordDerivations = derivations.count;

    derivations.count = 0;
    // What the handler does when `platform.lookup_password_credential` returns no row.
    expect(verifyPassword(DUMMY_PASSWORD_HASH, "a settled harbour lantErn")).toBe(false);
    const unknownAccountDerivations = derivations.count;

    expect(wrongPasswordDerivations).toBe(1);
    expect(unknownAccountDerivations).toBe(1);
  });

  it("counts one derivation for a correct password too", () => {
    const stored = hashPassword(PASSWORD);

    derivations.count = 0;
    expect(verifyPassword(stored, PASSWORD)).toBe(true);

    expect(derivations.count).toBe(1);
  });

  it("counts none at all for a stored string outside both shapes", () => {
    derivations.count = 0;
    expect(verifyPassword("not a stored hash", PASSWORD)).toBe(false);

    // A corrupt row costs nothing, which is right: there is no secret to compare against and no
    // account whose existence the answer could reveal.
    expect(derivations.count).toBe(0);
  });
});
