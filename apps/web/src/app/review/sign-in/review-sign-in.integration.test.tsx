import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REVIEW_SURFACE_DISCLOSURE } from "../../../server/authenticated-workspace-data.js";
import ReviewSignInPage, { REVIEW_SIGN_IN_SCOPE_STATEMENT } from "./page.js";

/**
 * PRD-005b 005B-AC-011 and 005B-AC-019.
 *
 * The page is a 404 unless the deployment is in review mode, and when it does render it says what
 * it is: a review-surface sign-in that is not HighLevel SSO and satisfies no deferred criterion.
 * The form offers a persona and a secret and nothing else, because the browser chooses neither the
 * location, the user, nor the role.
 */

function stubWorkspaceEnvironment(environment: string, reviewSurface: string | undefined): void {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
}

describe("review sign-in route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["preview without the review flag", "preview", undefined],
    ["preview with an unrecognised flag value", "preview", "yes"],
    ["production", "production", "authorized"],
  ])("is not found on %s", (_label, environment, reviewSurface) => {
    stubWorkspaceEnvironment(environment, reviewSurface);

    expect(() => ReviewSignInPage()).toThrow();
  });

  it("renders the disclosure, the scope statement, and a persona-only form in review mode", () => {
    stubWorkspaceEnvironment("preview", "authorized");

    render(ReviewSignInPage());

    expect(screen.getByText(REVIEW_SURFACE_DISCLOSURE)).toBeTruthy();
    expect(screen.getByText(REVIEW_SIGN_IN_SCOPE_STATEMENT)).toBeTruthy();
    expect(REVIEW_SIGN_IN_SCOPE_STATEMENT).toContain("not HighLevel SSO");
    expect(REVIEW_SIGN_IN_SCOPE_STATEMENT).toContain("satisfies no deferred G2 criterion");

    const personas = screen.getAllByRole("radio");
    expect(personas.map((input) => input.getAttribute("value"))).toEqual([
      "creator",
      "approver",
      "outsider",
    ]);

    const fieldNames = [...document.querySelectorAll("form [name]")].map((element) =>
      element.getAttribute("name"),
    );
    expect(new Set(fieldNames)).toEqual(new Set(["persona", "secret"]));
    expect(document.querySelector("form")?.getAttribute("action")).toBe("/api/review/session");
  });
});
