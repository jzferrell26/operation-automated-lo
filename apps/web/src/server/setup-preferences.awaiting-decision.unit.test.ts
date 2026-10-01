import type { DatabasePool } from "@oalo/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  APPROVER,
  awaitingApprovalProjection,
} from "../features/campaigns/components/campaign-decision.test-support.js";
import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { listWorkspaceCampaigns } from "./campaign-workspace-reads.js";
import { readSetupPreferences } from "./setup-preferences.js";
import {
  driverFailure,
  expectNoPersonSessionOrDriverWords,
  firstLoggedLine,
  spyOnServerLog,
  type ServerLogSpy,
} from "./setup-preferences.test-support.js";

/**
 * PRD-008b 008B-AC-009 to 008B-AC-011, writing review Re-review 4, suggestion R6.
 *
 * `undefined` for "the campaign waiting for this approver" has to mean one thing. It used to mean
 * both "there is none" and "the list could not be read", because the read swallowed every error, so
 * an approver whose read failed was told by the walkthrough that nothing was waiting for them. That
 * is a statement about their workspace the product did not know to be true. The read now says which
 * of the two it is, and it says so in the server's log as well, because a workspace whose list read
 * fails on every page would otherwise look like a workspace with nothing in it.
 */

// A `vi.mock` factory is hoisted above the imports, so what it shares is loaded inside it.
vi.mock("./campaign-workspace-reads.js", async () =>
  (await import("./setup-preferences.test-support.js")).campaignWorkspaceReadsDouble(),
);

vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  // The person has stored nothing, so the walkthrough is at its start.
  withTenantTransaction: (await import("./setup-preferences.test-support.js"))
    .transactionWithNothingStored,
}));

const POOL = {} as DatabasePool;
const ENVIRONMENT = {};

let logged: ServerLogSpy;

beforeEach(() => {
  vi.mocked(listWorkspaceCampaigns).mockReset();
  logged = spyOnServerLog();
});

afterEach(() => {
  logged.mockRestore();
});

describe("the campaign waiting for an approver, when the list cannot be read", () => {
  it("does not answer that none is waiting, because that is not known", async () => {
    vi.mocked(listWorkspaceCampaigns).mockRejectedValue(driverFailure());

    const preferences = await readSetupPreferences(APPROVER, ENVIRONMENT, POOL);

    expect(preferences.awaitingDecision).toBeUndefined();
    expect(preferences.awaitingDecisionFailed).toBe(true);
  });

  it("writes the failure to the server log, without the person, the session, or the driver's words", async () => {
    vi.mocked(listWorkspaceCampaigns).mockRejectedValue(driverFailure());

    await readSetupPreferences(APPROVER, ENVIRONMENT, POOL);

    expect(logged).toHaveBeenCalledTimes(1);
    const line = firstLoggedLine(logged);
    expect(line).toContain("setup-preferences");
    expect(line).toContain("campaign waiting for a decision");
    // The kind of failure is useful and carries nothing about anyone.
    expect(line).toContain("57P01");
    expectNoPersonSessionOrDriverWords(line, APPROVER);
  });
});

describe("the campaign waiting for an approver, when the list is read", () => {
  it("is not a failure when the workspace has nothing waiting, and nothing is logged", async () => {
    vi.mocked(listWorkspaceCampaigns).mockResolvedValue([]);

    const preferences = await readSetupPreferences(APPROVER, ENVIRONMENT, POOL);

    expect(preferences.awaitingDecision).toBeUndefined();
    expect(preferences.awaitingDecisionFailed).toBe(false);
    expect(logged).not.toHaveBeenCalled();
  });

  it("is the campaign that is waiting, and not a failure", async () => {
    const waiting = await awaitingApprovalProjection();
    vi.mocked(listWorkspaceCampaigns).mockResolvedValue([waiting]);

    const preferences = await readSetupPreferences(APPROVER, ENVIRONMENT, POOL);

    expect(preferences.awaitingDecision?.campaignRef).toBe(waiting.campaignRef);
    expect(preferences.awaitingDecisionFailed).toBe(false);
    expect(logged).not.toHaveBeenCalled();
  });
});

describe("the campaign list is not read at all for somebody it cannot be for", () => {
  it("leaves a creator alone, who cannot approve, and who is most people", async () => {
    vi.mocked(listWorkspaceCampaigns).mockRejectedValue(driverFailure());

    const preferences = await readSetupPreferences(
      createLocalSyntheticPrincipal(),
      ENVIRONMENT,
      POOL,
    );

    expect(listWorkspaceCampaigns).not.toHaveBeenCalled();
    expect(preferences.awaitingDecisionFailed).toBe(false);
    expect(logged).not.toHaveBeenCalled();
  });
});
