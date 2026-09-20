import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AccountSettingsPage from "../../app/(authenticated)/settings/account/page.js";
import ForgotPasswordPage from "../../app/(public)/forgot-password/page.js";
import ResetPasswordPage from "../../app/(public)/reset-password/page.js";
import ChooseWorkspacePage from "../../app/(public)/sign-in/choose/page.js";
import SignInPage from "../../app/(public)/sign-in/page.js";
import SignUpPage from "../../app/(public)/sign-up/page.js";
import VerifyEmailPage from "../../app/(public)/verify-email/page.js";
import {
  assertAuthPageIsServed,
  assertSignUpPageIsServed,
  signUpIsOffered,
} from "./auth-page-gate.js";

/**
 * PRD-006a 006A-AC-020 and 006A-AC-026, the page half.
 *
 * The route half of both criteria is proven in
 * `apps/web/src/server/password-authentication-handler.postgres.test.ts`, against a real
 * database. The pages answer through `next/navigation`'s `notFound` rather than through a status
 * code, so this file drives the seven page modules that carry the gate and asserts that the gate
 * fired: a page that quietly rendered in synthetic mode would serve a sign-in form on a
 * deployment that has no sign-in.
 *
 * `notFound` is replaced by a signal of its own so a call can be told apart from any other throw.
 * That is the whole reason to mock it: the real one throws a framework-internal digest that a
 * test would otherwise have to recognise by string.
 */
const navigation = vi.hoisted(() => {
  class NotFoundSignal extends Error {
    public constructor() {
      super("notFound() was called");
      this.name = "NotFoundSignal";
    }
  }
  return { NotFoundSignal };
});

vi.mock("next/navigation.js", () => ({
  notFound: (): never => {
    throw new navigation.NotFoundSignal();
  },
}));

/**
 * The same shape the route-level proofs build, minus the two database variables the pages never
 * read. `campaign-route-postgres-support.ts` is not imported for it because that module refuses
 * to load without a disposable database, and these proofs run in the offline gate.
 */
const REVIEW_MODE: Readonly<Record<string, string>> = Object.freeze({
  OALO_ENVIRONMENT: "local",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
  OALO_REVIEW_SURFACE: "authorized",
  OALO_APP_URL: "https://review.operation-automated-lo.test",
});

const SYNTHETIC_MODE: Readonly<Record<string, string>> = Object.freeze({
  ...REVIEW_MODE,
  OALO_REVIEW_SURFACE: "",
});

const MANAGED_NAMES: readonly string[] = Object.freeze([
  ...Object.keys(REVIEW_MODE),
  "OALO_SELF_SERVE_SIGNUP",
]);

let restoreEnvironment: () => void = () => undefined;

function applyEnvironment(values: Readonly<Record<string, string>>): void {
  const previous = new Map<string, string | undefined>();
  for (const name of MANAGED_NAMES) {
    previous.set(name, process.env[name]);
    const next = values[name];
    if (next === undefined) delete process.env[name];
    else process.env[name] = next;
  }
  restoreEnvironment = () => {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

/** Every page that carries the gate, invoked the way the router invokes it. */
const AUTH_PAGES: readonly Readonly<{ name: string; open: () => Promise<unknown> }>[] =
  Object.freeze([
    Object.freeze({ name: "/sign-in", open: () => SignInPage({ searchParams: emptySearch() }) }),
    Object.freeze({ name: "/sign-in/choose", open: () => ChooseWorkspacePage() }),
    Object.freeze({ name: "/sign-up", open: () => SignUpPage() }),
    Object.freeze({ name: "/forgot-password", open: () => ForgotPasswordPage() }),
    Object.freeze({
      name: "/reset-password",
      open: () => ResetPasswordPage({ searchParams: emptySearch() }),
    }),
    Object.freeze({
      name: "/verify-email",
      open: () => VerifyEmailPage({ searchParams: emptySearch() }),
    }),
    Object.freeze({ name: "/settings/account", open: () => AccountSettingsPage() }),
  ]);

function emptySearch(): Promise<Readonly<Record<string, string | string[] | undefined>>> {
  return Promise.resolve({});
}

beforeEach(() => {
  applyEnvironment(REVIEW_MODE);
});

afterEach(() => {
  restoreEnvironment();
});

describe("the auth page gate (006A-AC-026)", () => {
  it.each(AUTH_PAGES.map((page) => [page.name, page] as const))(
    "answers 404 for %s in synthetic mode",
    async (_name, page) => {
      applyEnvironment(SYNTHETIC_MODE);

      await expect(page.open()).rejects.toBeInstanceOf(navigation.NotFoundSignal);
    },
  );

  it("answers 404 for every auth page when the mode function refuses outright", async () => {
    // Neither synthetic nor review: a production deployment with no review flag, which
    // `authenticatedWorkspaceMode` refuses rather than classifying. The gate must treat a refusal
    // the same way it treats synthetic mode.
    applyEnvironment({ ...SYNTHETIC_MODE, OALO_ENVIRONMENT: "production" });

    for (const page of AUTH_PAGES) {
      await expect(page.open(), page.name).rejects.toBeInstanceOf(navigation.NotFoundSignal);
    }
  });

  it("serves every auth page except sign-up in review mode", async () => {
    for (const page of AUTH_PAGES.filter((candidate) => candidate.name !== "/sign-up")) {
      await expect(page.open()).resolves.toBeDefined();
    }
  });

  it("throws nothing from the gate helpers in review mode", () => {
    expect(() => {
      assertAuthPageIsServed(REVIEW_MODE);
    }).not.toThrow();
  });
});

describe("the sign-up page gate (006A-AC-020)", () => {
  it("answers 404 with OALO_SELF_SERVE_SIGNUP unset", async () => {
    await expect(SignUpPage()).rejects.toBeInstanceOf(navigation.NotFoundSignal);
    expect(signUpIsOffered()).toBe(false);
  });

  it("answers 404 with OALO_SELF_SERVE_SIGNUP set to anything but enabled", async () => {
    applyEnvironment({ ...REVIEW_MODE, OALO_SELF_SERVE_SIGNUP: "true" });

    await expect(SignUpPage()).rejects.toBeInstanceOf(navigation.NotFoundSignal);
    expect(signUpIsOffered()).toBe(false);
  });

  it("serves the page with OALO_SELF_SERVE_SIGNUP set to enabled", async () => {
    applyEnvironment({ ...REVIEW_MODE, OALO_SELF_SERVE_SIGNUP: "enabled" });

    await expect(SignUpPage()).resolves.toBeDefined();
    expect(signUpIsOffered()).toBe(true);
  });

  it("answers 404 in synthetic mode even with sign-up turned on", async () => {
    // The deployment mode is the outer gate: turning sign-up on cannot open a page on a
    // deployment that serves no sign-in at all.
    applyEnvironment({ ...SYNTHETIC_MODE, OALO_SELF_SERVE_SIGNUP: "enabled" });

    expect(() => {
      assertSignUpPageIsServed();
    }).toThrow(navigation.NotFoundSignal);
    expect(signUpIsOffered()).toBe(false);
  });
});
