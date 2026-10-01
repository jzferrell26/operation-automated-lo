import type { DatabasePool } from "@oalo/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  APPROVER,
  awaitingApprovalProjection,
} from "../features/campaigns/components/campaign-decision.test-support.js";
import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { listWorkspaceCampaigns } from "./campaign-workspace-reads.js";
import { readSetupPreferences } from "./setup-preferences.js";

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

vi.mock("./campaign-workspace-reads.js", () => ({
  listWorkspaceCampaigns: vi.fn(),
  loadWorkspaceCampaign: vi.fn(),
}));

vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  // The preferences table is not what these cases are about: the person has stored nothing, so the
  // walkthrough is at its start, and the read goes on to the campaign list.
  withTenantTransaction: async (
    _pool: unknown,
    _authority: unknown,
    work: (transaction: { read: () => Promise<readonly unknown[]> }) => Promise<unknown>,
  ) => work({ read: () => Promise.resolve([]) }),
}));

const POOL = {} as DatabasePool;
const ENVIRONMENT = {};

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(listWorkspaceCampaigns).mockReset();
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
});

/** What a database driver says when it fails: a message that may carry anything, and a short code. */
function driverFailure(): Error {
  return Object.assign(
    new Error("connection terminated while reading for dana.reyes@example.test"),
    { code: "57P01" },
  );
}

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
    const line = String(logged.mock.calls[0]?.join(" "));
    expect(line).toContain("setup-preferences");
    expect(line).toContain("campaign waiting for a decision");
    // The kind of failure is useful and carries nothing about anyone.
    expect(line).toContain("57P01");
    // The message is the driver's own and can carry a value, so it is not logged.
    expect(line).not.toContain("dana.reyes");
    expect(line).not.toContain("connection terminated");
    expect(line).not.toContain(APPROVER.actorId);
    expect(line).not.toContain(APPROVER.sessionId);
    expect(line).not.toContain(APPROVER.locationId);
    expect(line).not.toContain(APPROVER.actorRef);
    expect(line).not.toContain(APPROVER.locationRef);
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
