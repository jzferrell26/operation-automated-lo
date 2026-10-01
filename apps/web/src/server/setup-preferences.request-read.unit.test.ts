import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  APPROVER,
  awaitingApprovalProjection,
} from "../features/campaigns/components/campaign-decision.test-support.js";
import {
  createLocalSyntheticPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import { listWorkspaceCampaigns } from "./campaign-workspace-reads.js";
import { readSetupPreferencesForRequest } from "./setup-preferences.js";

/**
 * PRD-008b 008B-AC-009 to 008B-AC-011, the other half of writing review R6.
 *
 * The layout reads the guided setup's whole state through `readSetupPreferencesForRequest`, and it
 * used to answer the empty value for any failure at all: the walkthrough at its first step, with
 * no campaign waiting. An approver who cannot create a campaign could still press Continue through
 * the steps, because the saves go to a different request, and at step 6 the walkthrough told them
 * "Nothing is waiting for you" about a workspace it had not been able to look at. So for somebody
 * who is, or may be, an approver, the failure is the same failed state the campaign list read
 * reports, and it is logged the same way. For somebody who is known not to be able to approve, the
 * empty value is what it always was, and the sentence it feeds is not one that person is told.
 */

const mocks = vi.hoisted(() => ({
  withTenantTransaction: vi.fn(),
  resolveAuthenticatedReadPrincipal: vi.fn(),
  authenticatedWorkspaceMode: vi.fn(),
}));

vi.mock("./campaign-workspace-reads.js", () => ({
  listWorkspaceCampaigns: vi.fn(),
  loadWorkspaceCampaign: vi.fn(),
}));

vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  withTenantTransaction: mocks.withTenantTransaction,
}));

vi.mock("./authenticated-principal.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authenticated-principal.js")>()),
  resolveAuthenticatedReadPrincipal: mocks.resolveAuthenticatedReadPrincipal,
}));

vi.mock("./authenticated-workspace-data.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authenticated-workspace-data.js")>()),
  authenticatedWorkspaceMode: mocks.authenticatedWorkspaceMode,
}));

vi.mock("./runtime-authentication.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./runtime-authentication.js")>()),
  resolveRuntimeCampaignCommandPorts: () => ({}),
}));

vi.mock("./campaign-persistence-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => ({}),
}));

const REQUEST = new Request("https://oalo.local/overview");
const ENVIRONMENT = {};

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(listWorkspaceCampaigns).mockReset();
  mocks.withTenantTransaction.mockReset();
  mocks.resolveAuthenticatedReadPrincipal.mockReset();
  mocks.authenticatedWorkspaceMode.mockReset();
  mocks.authenticatedWorkspaceMode.mockReturnValue("review");
  mocks.resolveAuthenticatedReadPrincipal.mockResolvedValue(APPROVER);
  // The person has stored nothing, so the walkthrough is at its start.
  mocks.withTenantTransaction.mockImplementation(
    async (
      _pool: unknown,
      _authority: unknown,
      work: (transaction: { read: () => Promise<readonly unknown[]> }) => Promise<unknown>,
    ) => work({ read: () => Promise.resolve([]) }),
  );
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
});

/** What a driver says when it fails: a message that may carry anything, and a short code. */
function driverFailure(): Error {
  return Object.assign(
    new Error("connection terminated while reading for dana.reyes@example.test"),
    { code: "57P01" },
  );
}

function loggedLine(): string {
  return String(logged.mock.calls[0]?.join(" "));
}

describe("the guided setup's state, when an approver's read of it fails", () => {
  it("is the failed state and the walkthrough's first step, not nothing waiting", async () => {
    mocks.withTenantTransaction.mockRejectedValue(driverFailure());

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.awaitingDecisionFailed).toBe(true);
    expect(preferences.awaitingDecision).toBeUndefined();
    expect(preferences.campaign).toBeUndefined();
    expect(preferences.progress.status).toBe("not_started");
  });

  it("logs the error class and its code, and nothing about the person or the driver's words", async () => {
    mocks.withTenantTransaction.mockRejectedValue(driverFailure());

    await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(logged).toHaveBeenCalledTimes(1);
    const line = loggedLine();
    expect(line).toContain("setup-preferences");
    expect(line).toContain("Error");
    expect(line).toContain("57P01");
    expect(line).not.toContain("dana.reyes");
    expect(line).not.toContain("connection terminated");
    expect(line).not.toContain(APPROVER.actorId);
    expect(line).not.toContain(APPROVER.sessionId);
    expect(line).not.toContain(APPROVER.locationId);
    expect(line).not.toContain(APPROVER.actorRef);
    expect(line).not.toContain(APPROVER.locationRef);
  });

  it("is the failed state when the person could not be resolved, because an approver cannot be ruled out", async () => {
    mocks.resolveAuthenticatedReadPrincipal.mockRejectedValue(driverFailure());

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.awaitingDecisionFailed).toBe(true);
    expect(logged).toHaveBeenCalledTimes(1);
    expect(loggedLine()).toContain("57P01");
    expect(loggedLine()).not.toContain("dana.reyes");
  });
});

describe("the guided setup's state, when nobody is signed in", () => {
  it("is the empty value as it always was: nobody to look for is not a failure to look", async () => {
    mocks.resolveAuthenticatedReadPrincipal.mockRejectedValue(new UnauthenticatedPrincipalError());

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.awaitingDecisionFailed).toBe(false);
    expect(logged).not.toHaveBeenCalled();
  });
});

describe("the guided setup's state, when somebody known not to approve has the read fail", () => {
  it("is what it always was: the empty value, no failed state, and no new log line", async () => {
    mocks.resolveAuthenticatedReadPrincipal.mockResolvedValue(createLocalSyntheticPrincipal());
    mocks.withTenantTransaction.mockRejectedValue(driverFailure());

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.awaitingDecisionFailed).toBe(false);
    expect(preferences.awaitingDecision).toBeUndefined();
    expect(preferences.progress.status).toBe("not_started");
    expect(logged).not.toHaveBeenCalled();
  });
});

describe("the guided setup's state, when nothing failed", () => {
  it("is not a failure for an approver whose read worked and found nothing waiting", async () => {
    vi.mocked(listWorkspaceCampaigns).mockResolvedValue([]);

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.awaitingDecisionFailed).toBe(false);
    expect(logged).not.toHaveBeenCalled();
  });

  it("is the campaign that is waiting, and not a failure", async () => {
    // The fixture compiles a draft through the local synthetic principal, which the real workspace
    // mode allows only in a synthetic workspace; the read itself runs in a review one.
    mocks.authenticatedWorkspaceMode.mockReturnValue("synthetic");
    const waiting = await awaitingApprovalProjection();
    mocks.authenticatedWorkspaceMode.mockReturnValue("review");
    vi.mocked(listWorkspaceCampaigns).mockResolvedValue([waiting]);

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.awaitingDecision?.campaignRef).toBe(waiting.campaignRef);
    expect(preferences.awaitingDecisionFailed).toBe(false);
  });

  it("is the empty value, and not a failure, in a workspace with no database behind it", async () => {
    mocks.authenticatedWorkspaceMode.mockReturnValue("synthetic");

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.awaitingDecisionFailed).toBe(false);
    expect(mocks.resolveAuthenticatedReadPrincipal).not.toHaveBeenCalled();
    expect(logged).not.toHaveBeenCalled();
  });
});
