import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PermissionScreen } from "../../../../features/onboarding/components/permission-screen.js";
import { loadSyntheticUiFixture } from "../../../../features/ui-foundation/data/load-synthetic-ui.js";
import {
  OALO_REVIEW_SURFACE_AUTHORIZED,
  loadAuthenticatedWorkspace,
} from "../../../../server/authenticated-workspace-data.js";
import { metadata } from "./page.js";
import {
  collectFixtureStrings,
  forbiddenReviewStrings,
  leakedReviewStrings,
  reviewSurfaceText,
  staleAllowances,
  userLanguageForbiddenStrings,
  type ReviewSurfaceAllowance,
} from "../../review-surface-sweep.js";

/**
 * Every synthetic UI fixture string that may legitimately reach the rendered review connections
 * route. The fixture states which capabilities are granted and which are missing, and dates the
 * grant evidence; none of that can be observed with no install, so only capability identity, the
 * business purpose the app declares for each scope, and closed enums survive.
 */
const connectionsAllowances: readonly ReviewSurfaceAllowance[] = [
  {
    path: "onboarding.permissionGroups[*].capabilities[*].label",
    because: "Names a capability this app can request. Product structure, not observed state.",
  },
  {
    path: "onboarding.permissionGroups[*].capabilities[*].businessPurpose",
    because:
      "The declared reason this app would request the scope. A Marketplace reviewer needs it, and it claims nothing about this deployment.",
  },
  {
    path: "onboarding.permissionGroups[*].category",
    because:
      "Closed permission-group enum used as the section key; review mode restates the group label as the category's meaning.",
  },
  {
    path: "onboarding.safety.dataMode",
    because: "Literal 'synthetic' fixed by runtimeSafetySchema.",
  },

  // Short closed-vocabulary tokens that collide with copy this route legitimately renders.
  // Each is pinned to its one colliding value, so the rest of the field stays forbidden.
  {
    path: "onboarding.permissionGroups[*].label",
    value: "Optional",
    because: "Substring of the not-connected group label 'Optional access'.",
  },
  {
    path: "onboarding.permissionGroups[*].label",
    value: "Missing",
    because:
      "The screen's own state chip for the missing group renders this word (PRD-006b D5 rule R4); the fixture's group label never reaches this route.",
  },
  {
    path: "onboarding.getConnected[*].state",
    value: "blocked",
    because:
      "Substring of the group label 'Access this app tells you about when something is blocked'.",
  },
  {
    path: "navigation.items[*].state",
    value: "available",
    because:
      "Substring of the not-connected next step, 'Connecting HighLevel and Meta isn't available in the app yet.' (writing review pass 2, W-28).",
  },
  {
    path: "navigation.items[*].id",
    value: "campaigns",
    because:
      "Substring of the allowed capability label 'Create campaigns'. The one six-item menu (PRD-009a) names this item 'campaigns'.",
  },
  {
    path: "overview.activeWork[*].type",
    value: "campaign",
    because: "Substring of the allowed capability label 'Create campaigns'.",
  },
  {
    path: "overview.health[*].id",
    value: "routing",
    because: "Substring of the allowed business purpose that names your HighLevel routing.",
  },
  {
    path: "overview.health[*].label",
    value: "HighLevel",
    because: "Substring of the not-connected disclosure, which names both accounts.",
  },
  {
    path: "overview.health[*].label",
    value: "Meta",
    because: "Substring of the not-connected disclosure.",
  },
];

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
  const { container } = render(<PermissionScreen onboarding={workspace.ui.onboarding} />);
  return { container, workspace };
}

describe("authenticated settings connections route", () => {
  it("sweeps the whole fixture rather than a curated list of permission keys", () => {
    const fixture = loadSyntheticUiFixture();

    // 426 strings before PRD-009a, 382 after. The whole drop is the navigation block: nine items
    // and six marketing items (71 strings) became the one six-item menu (26 strings), and the
    // session gained one `reports:read` grant. Every string outside `navigation` is still swept.
    expect(collectFixtureStrings(fixture).length).toBeGreaterThan(350);
    expect(forbiddenReviewStrings(fixture, connectionsAllowances).length).toBeGreaterThan(200);
    expect(staleAllowances(fixture, connectionsAllowances)).toEqual([]);
  });

  it("keeps every unallowed fixture string out of the rendered review connections route", () => {
    const { container } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const forbidden = forbiddenReviewStrings(loadSyntheticUiFixture(), connectionsAllowances);

    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden)).toEqual([]);
  });

  /*
   * Writing review pass 1, guard gap 3. The capability labels and purposes a loan officer reads on
   * this page come from `fixtures/ui-foundation/synthetic-ui.ts`, which the source guard does not
   * scan (`forbidden-vocabulary.test.ts` skips `apps/web/src/fixtures`). The page is the one place
   * those words reach a person, so the guard reads the page: the whole user-language contract, with
   * no allowance at all, over everything it renders, including the labels.
   */
  it("holds the labels the fixture supplies to the user-language contract, with no allowance", () => {
    const { container } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);

    expect(
      leakedReviewStrings(reviewSurfaceText(container), userLanguageForbiddenStrings()),
    ).toEqual([]);
  });

  /*
   * The labels themselves are pinned, so a capability added to the fixture, or a label reworded,
   * fails here until somebody has read the new words as a loan officer would. The second list is
   * the "Why it's needed" line under each.
   */
  it("pins the capability labels and purposes a loan officer reads, so a change is read first", () => {
    const { container } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const page = within(container);

    expect(
      page.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent),
    ).toEqual([
      "Read your workspace",
      "Create campaigns",
      "Read agency reports",
      "Read your workflows",
    ]);
    const purposes = [...container.querySelectorAll("dt")]
      .filter((term) => term.textContent === "Why it's needed")
      .map((term) => term.nextElementSibling?.textContent);
    expect(purposes).toEqual([
      "Know which workspace you are in and where your leads should go.",
      "Let you set up an ad in your own workspace.",
      "Show totals across every workspace an agency sign-in covers.",
      "Show your HighLevel workflows beside your routing, so you can see both.",
    ]);
  });

  it("states that no capability has an observed grant state", () => {
    const { container, workspace } = renderConnections(
      "production",
      OALO_REVIEW_SURFACE_AUTHORIZED,
    );
    const capabilities = workspace.ui.onboarding.permissionGroups.flatMap(
      (group) => group.capabilities,
    );

    expect(capabilities.length).toBeGreaterThan(0);
    expect(capabilities.every((capability) => capability.evidence === "Nothing checked yet.")).toBe(
      true,
    );
    expect(capabilities.every((capability) => capability.impact === "No effect yet.")).toBe(true);
    expect(container.textContent).not.toContain("Synthetic App Test evidence verified");
    // The four groups share one description, "You haven't connected HighLevel yet, so there's
    // nothing to confirm here.", and the page's notice says as much once. The scored review's F-12
    // found it four times under four headings, so the page leaves the shared copy out and the
    // notice is the one statement (see "F-12" below).
    expect(
      new Set(workspace.ui.onboarding.permissionGroups.map((group) => group.description)).size,
    ).toBe(1);
    expect(
      screen.queryByText(
        "You haven't connected HighLevel yet, so there's nothing to confirm here.",
      ),
    ).toBeNull();
    expect(screen.getByText("Nothing is connected from this page")).toBeInTheDocument();
  });

  it("restates each group label as the category's meaning rather than an observation", () => {
    const { workspace } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const labels = workspace.ui.onboarding.permissionGroups.map((group) => group.label);

    expect(labels).toEqual([
      "Access this app needs",
      "Access this app confirms after you connect",
      "Access this app tells you about when something is blocked",
      "Optional access",
    ]);
  });

  it("keeps the demo-rich synthetic permission evidence for local development", () => {
    const { container } = renderConnections("local", undefined);
    const forbidden = forbiddenReviewStrings(loadSyntheticUiFixture(), connectionsAllowances);

    expect(container.textContent).toContain("Synthetic App Test evidence verified");
    expect(leakedReviewStrings(reviewSurfaceText(container), forbidden).length).toBeGreaterThan(10);
  });
});

/**
 * PRD-009 writing review closing check, N-1. Connections is the page every "See what's needed"
 * link opens, and its tab still read "Automated LO" beside the pages that name themselves.
 */
describe("the Connections tab", () => {
  it("names the page, and the root layout's template adds the product after it", () => {
    expect(metadata.title).toBe("Connections");
  });
});

/**
 * PRD-009 writing review closing check, N-2. "What it affects" said "No effect until you connect"
 * one line above "Connecting HighLevel and Meta isn't available in the app yet", so the first read
 * as a promise that connecting would have an effect and the second said no one can connect.
 */
describe("what each capability affects, while nothing can be connected", () => {
  it("says nothing is connected and never suggests there is a connect step", () => {
    const { container } = renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);
    const impacts = [...container.querySelectorAll("dt")]
      .filter((term) => term.textContent === "What it affects")
      .map((term) => term.nextElementSibling?.textContent);

    expect(impacts.length).toBeGreaterThan(0);
    expect(new Set(impacts)).toEqual(new Set(["No effect yet."]));
    expect(container.textContent).not.toContain("No effect until you connect");
  });
});

describe("the next step, said once (009G-AC-009, D2)", () => {
  it("states a next step every capability shares once, under the notice, and on no card", () => {
    const { container, workspace } = renderConnections(
      "production",
      OALO_REVIEW_SURFACE_AUTHORIZED,
    );
    const shared = workspace.ui.onboarding.permissionGroups[0]?.capabilities[0]?.nextAction ?? "";
    expect(shared).not.toBe("");
    const text = container.textContent ?? "";
    expect(text.split(shared).length - 1).toBe(1);
    expect(container.querySelector("[data-shared-next-action]")?.textContent).toContain(shared);
    expect(within(container).queryAllByText("What to do next", { selector: "dt" })).toHaveLength(0);
  });

  it("keeps a next step on each card when the capabilities' steps differ", () => {
    const { container, workspace } = renderConnections("local", undefined);
    const actions = workspace.ui.onboarding.permissionGroups.flatMap((group) =>
      group.capabilities.map((capability) => capability.nextAction),
    );
    expect(new Set(actions).size).toBeGreaterThan(1);
    expect(container.querySelector("[data-shared-next-action]")).toBeNull();
    expect(within(container).queryAllByText("What to do next", { selector: "dt" })).toHaveLength(
      actions.length,
    );
  });
});

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
  it("draws the notice as the Surface primitive's info variant, not as a Card with a module fill", () => {
    renderConnections("production", OALO_REVIEW_SURFACE_AUTHORIZED);

    const notice = screen
      .getByText("Nothing is connected from this page")
      .closest("[data-variant]");

    expect(notice).not.toBeNull();
    expect(notice?.getAttribute("data-variant")).toBe("info");
    expect(notice?.getAttribute("data-padding")).toBe("md");
    expect(notice?.classList.contains("oalo-surface")).toBe(true);
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
