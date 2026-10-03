import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RESET_PASSWORD } from "../../../features/auth/strings.js";
import ResetPasswordPage from "./page.js";

/**
 * Pass 4, R4 F4-01. A reset page opened with no token in its address says the link has expired,
 * and says to request a new one. That sentence is only useful with the way to do it beside it, as
 * the refused form's alert has, so this page carries the same link to `/forgot-password`.
 *
 * The gate that answers 404 outside the signed-in product is proven in
 * `features/auth/auth-page-gate.integration.test.tsx`; it is stood aside here so that this file
 * holds the page's words and nothing else.
 */
vi.mock("../../../features/auth/auth-page-gate.js", () => ({
  assertAuthPageIsServed: (): void => undefined,
}));

describe("the reset page opened with no token", () => {
  it("says the link has expired and links to the page that sends a new one", async () => {
    render(await ResetPasswordPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(RESET_PASSWORD.expiredError)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RESET_PASSWORD.requestNewLinkLabel })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(screen.queryByRole("button", { name: RESET_PASSWORD.submitLabel })).toBeNull();
  });

  it("shows the form, and no request link, when the address carries a token", async () => {
    render(await ResetPasswordPage({ searchParams: Promise.resolve({ token: "a-token" }) }));

    expect(screen.getByRole("button", { name: RESET_PASSWORD.submitLabel })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: RESET_PASSWORD.requestNewLinkLabel })).toBeNull();
  });
});
