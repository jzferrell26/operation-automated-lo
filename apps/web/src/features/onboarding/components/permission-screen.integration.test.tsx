import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OALO_REVIEW_SURFACE_AUTHORIZED,
  loadAuthenticatedWorkspace,
} from "../../../server/authenticated-workspace-data.js";
import { PermissionScreen } from "./permission-screen.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, on the Connections page:
 *
 * - F-12: a page says each connection sentence once (PRD-009g D2). The review surface's four groups
 *   all carried "You haven't connected HighLevel yet, so there's nothing to confirm here." under
 *   their headings, below a notice that already says nothing is connected. The D2 reader does not
 *   know that shape ("haven't connected"), so the repeat passed 009G-AC-009 and a person saw it.
 * - F-09: each group's state is the shared `Badge`, with its glyph, and not a hand-built pill.
 * - F-10: the notice is not drawn on a `Card`, whose own rule beat the notice's informational
 *   surface whatever order the sheets loaded in.
 * - F-08: the capability cards carry the page's card padding, `--space-6`, not the 8px `sm`.
 */

beforeEach(() => {
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function renderConnections(environment: string, reviewSurface: string | undefined) {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
  const workspace = loadAuthenticatedWorkspace();
  return render(<PermissionScreen onboarding={workspace.ui.onboarding} />);
}

/** Every sentence on the page that says HighLevel or Meta is not connected, in any of its shapes. */
function connectionSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.replaceAll(/\s+/gu, " ").trim())
    .filter(
      (sentence) =>
        /\b(?:highlevel|meta)\b/iu.test(sentence) &&
        /(?:\bnot\s+connected|n['’]t\s+connected|\bhaven['’]t\s+connected|\bnothing\s+(?:here\s+)?is\s+connected)/iu.test(
          sentence,
        ),
    );
}

describe("F-12: the Connections page says what is not connected once", () => {
  it("does not repeat the not-connected sentence under every group", () => {
    const { container } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);

    const said = connectionSentences(container.textContent ?? "");

    expect(said.length, "the notice still says it").toBeGreaterThanOrEqual(1);
    expect(said.length, "and it says each sentence once").toBe(new Set(said).size);
    expect(container.textContent).not.toContain("You haven't connected HighLevel yet");
  });

  it("keeps the notice as the one place, and every group's cards", () => {
    renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);

    expect(screen.getByText("Nothing is connected from this page")).toBeInTheDocument();
    for (const group of [
      "Access this app needs",
      "Access this app confirms after you connect",
      "Access this app tells you about when something is blocked",
      "Optional access",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: group })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThanOrEqual(4);
  });

  it("keeps a description that is a group's own, so nothing a group says alone is lost", () => {
    renderConnections("local", undefined);

    for (const own of [
      "Access Automated LO has to ask for before it can do anything.",
      "Access you have already given, and we have checked.",
      "Access we need but do not have, and what it stops you doing.",
      "Nice to have. You can finish setup without any of these.",
    ]) {
      expect(screen.getByText(own)).toBeInTheDocument();
    }
  });
});

describe("F-09: each group's state is the shared Badge", () => {
  it.each([
    ["production", OALO_REVIEW_SURFACE_AUTHORIZED],
    ["local", undefined],
  ] as const)("pairs every state word with a glyph in %s", (environment, reviewSurface) => {
    const { container } = renderConnections(environment, reviewSurface);

    const chips = container.querySelectorAll("[data-permission-category]");

    expect([...chips].map((chip) => chip.textContent)).toEqual([
      "Needed",
      "Confirmed",
      "Missing",
      "Optional",
    ]);
    for (const chip of chips) {
      expect(chip.classList.contains("oalo-state-label"), "drawn by Badge").toBe(true);
      expect(chip.querySelector("svg"), `${chip.textContent ?? ""} carries a glyph`).not.toBeNull();
      // A kind of access, not a state of this workspace, so no tone claims a check that was not made.
      expect(chip.getAttribute("data-tone")).toBe("neutral");
    }
  });
});

describe("F-10 and F-08: the notice and the capability cards", () => {
  it("draws the notice on its own element, not on a Card whose rule would outrank it", () => {
    renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);

    const notice = screen.getByText("Nothing is connected from this page").closest("div[class]");

    expect(notice).not.toBeNull();
    expect(notice?.closest("[data-variant]")).toBeNull();
    expect(notice?.getAttribute("data-variant")).toBeNull();
  });

  it("pads each capability card at the page's card step, not the 8px small step", () => {
    const { container } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);

    const cards = container.querySelectorAll("article[data-padding]");

    expect(cards.length).toBeGreaterThanOrEqual(4);
    for (const card of cards) {
      expect(card.getAttribute("data-padding")).toBe("lg");
    }
  });
});
