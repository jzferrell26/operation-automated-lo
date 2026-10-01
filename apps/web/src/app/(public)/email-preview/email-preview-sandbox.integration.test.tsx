import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import EmailPreviewPage from "./page.js";

/**
 * PRD-008a 008A-AC-021. The email preview frames carry exactly `sandbox="allow-scripts"`.
 *
 * `allow-scripts` alone is the most restrictive value under which the browser suite's axe run can
 * still check the email documents (the reason is recorded at the call site in `page.tsx`). The one
 * value it must never be widened to is anything containing `allow-same-origin`: together with
 * `allow-scripts` it lets the framed document remove its own sandbox. So the attribute is pinned
 * token for token, and the forbidden token is asserted absent on its own, so a widening fails with
 * a message that names it.
 */

vi.mock("next/navigation.js", () => ({
  notFound: () => {
    throw new Error("the email preview answered 404 in synthetic mode");
  },
}));

/** Synthetic mode, the only mode the preview renders in. */
beforeEach(() => {
  vi.stubEnv("OALO_ENVIRONMENT", "local");
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the email preview frames (008A-AC-021)", () => {
  it("sandbox both emails with allow-scripts and nothing else", async () => {
    const { container } = render(await EmailPreviewPage());
    const frames = [...container.querySelectorAll("iframe[data-email-preview]")];

    expect(frames).toHaveLength(2);
    for (const frame of frames) {
      expect(frame.hasAttribute("sandbox")).toBe(true);
      const tokens = (frame.getAttribute("sandbox") ?? "").split(/\s+/u).filter(Boolean);
      expect(tokens, "allow-same-origin must never be granted").not.toContain("allow-same-origin");
      expect(tokens).toEqual(["allow-scripts"]);
    }
  });
});
