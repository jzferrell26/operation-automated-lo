import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clientAddressFor,
  resetAuthHandlerProcessStateForTests,
} from "./password-authentication-handler.js";

/**
 * PRD-008a, the parts of the password handler a test can hold without a database: the address
 * the per-address limits key on (008A-AC-016) and the level the missing-address line is logged at
 * (008A-AC-017).
 *
 * The Postgres half of the same handler lives in `password-authentication-handler.postgres.test.ts`
 * and `password-recovery-handler.postgres.test.ts`; nothing here replaces either.
 */

const HOST = "review.operation-automated-lo.test";
const ORIGIN = `https://${HOST}`;

afterEach(() => {
  resetAuthHandlerProcessStateForTests();
});

function addressRequest(headers: Readonly<Record<string, string>>): Request {
  return new Request(`${ORIGIN}/api/auth/sign-in?marker=request-only-value`, {
    method: "POST",
    headers,
  });
}

describe("clientAddressFor (008A-AC-016)", () => {
  it("reads x-vercel-forwarded-for before either other header", () => {
    expect(
      clientAddressFor(
        addressRequest({
          "x-vercel-forwarded-for": "203.0.113.7",
          "x-forwarded-for": "198.51.100.8, 10.0.0.1",
          "x-real-ip": "192.0.2.9",
        }),
      ),
    ).toBe("203.0.113.7");
  });

  it("falls back to the first x-forwarded-for entry when the Vercel header is absent", () => {
    expect(
      clientAddressFor(
        addressRequest({ "x-forwarded-for": "198.51.100.8, 10.0.0.1", "x-real-ip": "192.0.2.9" }),
      ),
    ).toBe("198.51.100.8");
  });

  it("falls back to x-real-ip when neither forwarded header is present", () => {
    expect(clientAddressFor(addressRequest({ "x-real-ip": "192.0.2.9" }))).toBe("192.0.2.9");
  });

  it("skips an empty or oversized Vercel header rather than keying on it", () => {
    expect(
      clientAddressFor(
        addressRequest({ "x-vercel-forwarded-for": " ", "x-forwarded-for": "198.51.100.8" }),
      ),
    ).toBe("198.51.100.8");
    expect(
      clientAddressFor(
        addressRequest({ "x-vercel-forwarded-for": "9".repeat(101), "x-real-ip": "192.0.2.9" }),
      ),
    ).toBe("192.0.2.9");
  });
});

describe("the missing-address line (008A-AC-017)", () => {
  it("is an error, carries no request value, and fires once per process", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const request = addressRequest({ "x-client-note": "request-only-value" });

    expect(clientAddressFor(request)).toBeUndefined();
    expect(clientAddressFor(request)).toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    const line = error.mock.calls[0]?.map(String).join(" ") ?? "";
    expect(error.mock.calls[0]).toHaveLength(1);
    expect(line).toContain("x-vercel-forwarded-for");
    expect(line).not.toContain("request-only-value");
    expect(line).not.toContain(ORIGIN);

    // Once per process, not once ever: a fresh process logs it again.
    resetAuthHandlerProcessStateForTests();
    clientAddressFor(request);
    expect(error).toHaveBeenCalledTimes(2);
  });
});
