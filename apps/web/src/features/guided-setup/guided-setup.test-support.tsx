import { projectCampaignWorkspace, type CampaignWorkspaceProjection } from "@oalo/application";

import { createLocalSyntheticPrincipal } from "../../server/authenticated-principal.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
} from "../../server/campaign-command-test-support.js";
import { compileOpenHouseDraft } from "../../server/open-house-draft.js";
import { initialGuidedSetupProgress, type GuidedSetupProgress } from "./model/progress.js";
import type { SetupProfile } from "./model/profile.js";

/**
 * What the guided-setup suites share: a campaign projection built the way the real screen builds
 * one, and the two provider inputs.
 *
 * The projection is compiled through `compileOpenHouseDraft` rather than hand-written, so the
 * screens under test see the same shape the route produces. A hand-written projection is a second
 * definition of a campaign, and the first thing it does is stop matching.
 */
export async function campaignProjection(
  role: "campaign_creator" | "campaign_approver" = "campaign_approver",
): Promise<CampaignWorkspaceProjection> {
  const principal = createLocalSyntheticPrincipal({ role });
  const compiled = await compileOpenHouseDraft(
    OPEN_HOUSE_DRAFT_INPUT,
    createLocalSyntheticPrincipal(),
    LOCAL_SYNTHETIC_ENV,
  );
  return projectCampaignWorkspace(
    {
      version: compiled.version,
      preflight: compiled.preflight,
      state: "awaiting_approval" as const,
      rowVersion: 1,
      updatedAt: compiled.version.createdAt,
    },
    principal,
    "postgres",
  );
}

export function progressAt(
  step: number,
  overrides: Partial<GuidedSetupProgress> = {},
): GuidedSetupProgress {
  return {
    ...initialGuidedSetupProgress(),
    status: "in_progress",
    currentStep: step,
    completedSteps: Array.from({ length: step - 1 }, (_unused, index) => index + 1),
    ...overrides,
  };
}

export const SAMPLE_PROFILE: SetupProfile = Object.freeze({
  displayName: "Dana Reyes",
  company: "Northgate Lending",
  nmlsNumber: "1465666",
  phone: "555 0134",
  realtorName: "Priya Nadeem",
  realtorBrokerage: "Nadeem and Co",
});

/**
 * A `fetch` that records the guided setup's writes and answers the way the routes answer, so a
 * component test can prove what was saved without a server. It never reaches the network: anything
 * the component asks for that is not one of the two setup addresses fails the test loudly.
 */
export function recordingSetupFetch(
  /**
   * What a named address answers with, for the addresses that do not simply echo. The two setup
   * writes echo, because echoing is what those routes do; `/api/campaigns/preflight` answers with
   * a saved campaign, which is a different shape from the draft that was posted.
   */
  answers: Readonly<Record<string, unknown>> = {},
): Readonly<{
  calls: { path: string; body: unknown }[];
  fetch: typeof globalThis.fetch;
}> {
  const calls: { path: string; body: unknown }[] = [];
  const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const body: unknown = JSON.parse(String(init?.body ?? "{}"));
    calls.push({ path, body });
    return new Response(JSON.stringify(answers[path] ?? body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  return { calls, fetch: fetchStub };
}

/**
 * A `fetch` that holds the first progress write open until it is released, so the window between
 * a press and its answer can be looked at.
 *
 * Two of the provider's races live in exactly that window: an overtaken reply arriving last
 * (F-23), and a dismissal settling after the person has asked for the walkthrough again (Wave 7m).
 * Both are proven by putting a second press inside the window and releasing afterwards, which is
 * the order that used to lose.
 */
export function heldProgressWriteFetch(): Readonly<{
  fetch: typeof globalThis.fetch;
  progressWrites: () => number;
  release: () => void;
}> {
  let releaseFirst: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let progressWrites = 0;
  const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const body: unknown = JSON.parse(String(init?.body ?? "{}"));
    if (path === "/api/setup/progress") {
      progressWrites += 1;
      // The first write answers last, and answers with the progress it was told, which by then is
      // the old one.
      if (progressWrites === 1) await held;
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  return {
    fetch: fetchStub,
    progressWrites: () => progressWrites,
    release: () => {
      releaseFirst?.();
    },
  };
}

/**
 * PRD-006d D3's ready campaign, as `/api/campaigns/preflight` answers with one: nothing blocking,
 * a detail address of its own, and the four summary values the result block prints.
 */
export const READY_PREFLIGHT_RESPONSE = Object.freeze({
  state: "awaiting_approval",
  detailHref: "/marketing/campaigns/campaign_7m4f6a1c2e0000400080000000000001",
  campaignRef: "campaign_7m4f6a1c2e0000400080000000000001",
  campaignVersionRef: "version_7m4f6a1c2e0000400080000000000001",
  manifestHash: "0".repeat(64),
  preflightResultHash: "1".repeat(64),
  blocking: false,
  findings: [],
  headline: "Open house this Saturday",
  propertyAddress: "48 Cedar Street, Austin",
  realtorDisplayName: "Priya Nadeem",
  dailyBudgetMinor: 2500,
  totalBudgetMinor: 12_500,
  specialAdCategory: "housing",
  persistenceKind: "postgres",
  providerPublicationAuthorized: false,
});
