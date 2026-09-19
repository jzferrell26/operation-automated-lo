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
export function recordingSetupFetch(): Readonly<{
  calls: { path: string; body: unknown }[];
  fetch: typeof globalThis.fetch;
}> {
  const calls: { path: string; body: unknown }[] = [];
  const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const body: unknown = JSON.parse(String(init?.body ?? "{}"));
    calls.push({ path, body });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  return { calls, fetch: fetchStub };
}
