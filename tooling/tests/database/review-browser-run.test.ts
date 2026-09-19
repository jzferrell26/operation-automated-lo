import { describe, expect, it } from "vitest";

import {
  REVIEW_APP_URL,
  REVIEW_HTTP_PORT,
  REVIEW_HTTPS_PORT,
  certificateCommand,
  parseReviewRunArguments,
  reviewServerEnvironment,
} from "../../scripts/database/review-browser-run.mjs";

/**
 * PRD-006c D9 and 006C-AC-014, as facts about the run rather than about the walkthrough.
 *
 * Three of these are the kind of thing that only fails in CI, weeks later, in a way nobody reads:
 * a stray email variable that turns the not-configured adapter into a live one, a certificate
 * without the loopback address in it, and a database URL that is not disposable. Each is one
 * assertion here.
 */

const DISPOSABLE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/oalo_test_campaign";

describe("review browser run", () => {
  it("serves the review composition over TLS on the loopback interface", () => {
    expect(REVIEW_APP_URL).toBe(`https://127.0.0.1:${String(REVIEW_HTTPS_PORT)}`);
    expect(REVIEW_HTTP_PORT).toBe(3100);
    const environment = reviewServerEnvironment(DISPOSABLE_URL);
    expect(environment["OALO_REVIEW_SURFACE"]).toBe("authorized");
    expect(environment["OALO_APP_URL"]).toBe(REVIEW_APP_URL);
    expect(environment["OALO_ALLOWED_ORIGINS"]).toBe(REVIEW_APP_URL);
    expect(environment["OALO_SELF_SERVE_SIGNUP"]).toBe("enabled");
    expect(environment["OALO_PROVIDER_MODE"]).toBe("stub");
    expect(environment["OALO_SYNTHETIC_DATA_ONLY"]).toBe("true");
  });

  it("configures no email at all, which is the honest not-configured state", () => {
    const environment = reviewServerEnvironment(DISPOSABLE_URL);
    expect(environment["OALO_RESEND_API_KEY"]).toBeUndefined();
    expect(environment["OALO_EMAIL_FROM"]).toBeUndefined();
  });

  it("mints a fresh CSRF secret per run rather than reusing one", () => {
    const first = reviewServerEnvironment(DISPOSABLE_URL)["OALO_CSRF_SERVER_SECRET"];
    const second = reviewServerEnvironment(DISPOSABLE_URL)["OALO_CSRF_SERVER_SECRET"];
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43,512}$/u);
  });

  it("asks openssl for a short-lived certificate that covers the loopback address", () => {
    const certificate = certificateCommand("/tmp/oalo-review");
    expect(certificate.command).toBe("openssl");
    expect(certificate.args).toContain("-x509");
    expect(certificate.args).toContain("/CN=127.0.0.1");
    expect(certificate.args).toContain("subjectAltName=IP:127.0.0.1,DNS:localhost");
    // One day. A certificate that outlives the run it was made for is a certificate somebody
    // eventually trusts for something else.
    expect(certificate.args[certificate.args.indexOf("-days") + 1]).toBe("1");
  });

  it("refuses to point the run at a database that is not disposable", () => {
    expect(() =>
      parseReviewRunArguments([
        "--database-url",
        "postgresql://postgres@127.0.0.1:5432/production",
        "--creator-email",
        "creator@oalo.invalid",
        "--approver-email",
        "approver@oalo.invalid",
      ]),
    ).toThrow("disposable oalo_test_ database");
  });

  it("takes the shared password from the environment, never from the command line", () => {
    const previous = process.env["OALO_TEST_SEEDED_PASSWORD"];
    process.env["OALO_TEST_SEEDED_PASSWORD"] = "gate harbour lantern phrase";
    try {
      const parsed = parseReviewRunArguments([
        "--database-url",
        DISPOSABLE_URL,
        "--creator-email",
        "creator@oalo.invalid",
        "--approver-email",
        "approver@oalo.invalid",
      ]);
      expect(parsed.seededCredentials.password).toBe("gate harbour lantern phrase");
      expect(parsed.databaseUrl).toBe(DISPOSABLE_URL);
    } finally {
      if (previous === undefined) delete process.env["OALO_TEST_SEEDED_PASSWORD"];
      else process.env["OALO_TEST_SEEDED_PASSWORD"] = previous;
    }
  });

  it("refuses to run without the password the seeded sign-ins need", () => {
    const previous = process.env["OALO_TEST_SEEDED_PASSWORD"];
    delete process.env["OALO_TEST_SEEDED_PASSWORD"];
    try {
      expect(() =>
        parseReviewRunArguments([
          "--database-url",
          DISPOSABLE_URL,
          "--creator-email",
          "creator@oalo.invalid",
          "--approver-email",
          "approver@oalo.invalid",
        ]),
      ).toThrow("OALO_TEST_SEEDED_PASSWORD");
    } finally {
      if (previous !== undefined) process.env["OALO_TEST_SEEDED_PASSWORD"] = previous;
    }
  });
});
