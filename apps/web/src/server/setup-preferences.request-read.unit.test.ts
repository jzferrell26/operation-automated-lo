import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLocalSyntheticPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import { readSetupPreferencesForRequest } from "./setup-preferences.js";
import {
  driverFailure,
  expectNoPersonSessionOrDriverWords,
  firstLoggedLine,
  spyOnServerLog,
  transactionWithNothingStored,
  type ServerLogSpy,
} from "./setup-preferences.test-support.js";

/**
 * PRD-009b D4 and 009B-AC-012. What is left of the setup read once the walkthrough is gone: the
 * saved profile the Brand form prefills from.
 *
 * Until 2026-10-01 the layout read the guided setup's whole state through this function, and it
 * answered a failure with a flag the walkthrough read to tell an approver that "nothing is waiting"
 * (PRD-008b, writing review R6). Nothing asks that of this read now: Home reads the campaigns that
 * wait for an approver itself (`home-reads.ts`), and a failure to read a profile costs a prefill and
 * nothing else. So the read answers the empty value for any failure, and says what kind of failure
 * it was in the server's log, never who it happened to.
 */

const mocks = vi.hoisted(() => ({
  withTenantTransaction: vi.fn(),
  resolveAuthenticatedReadPrincipal: vi.fn(),
  authenticatedWorkspaceMode: vi.fn(),
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

const REQUEST = new Request("https://oalo.local/brand");
const ENVIRONMENT = {};
const PERSON = createLocalSyntheticPrincipal({ role: "location_admin" });

let logged: ServerLogSpy;

beforeEach(() => {
  mocks.withTenantTransaction.mockReset();
  mocks.resolveAuthenticatedReadPrincipal.mockReset();
  mocks.authenticatedWorkspaceMode.mockReset();
  mocks.authenticatedWorkspaceMode.mockReturnValue("review");
  mocks.resolveAuthenticatedReadPrincipal.mockResolvedValue(PERSON);
  mocks.withTenantTransaction.mockImplementation(transactionWithNothingStored);
  logged = spyOnServerLog();
});

afterEach(() => {
  logged.mockRestore();
});

describe("the saved profile, read for the Brand form (009B-AC-012)", () => {
  it("is the profile the person saved", async () => {
    mocks.withTenantTransaction.mockImplementation(
      (_pool: unknown, _authority: unknown, work: (transaction: unknown) => Promise<unknown>) =>
        work({
          read: () =>
            Promise.resolve([
              {
                key: "setup_profile.v1",
                value: {
                  displayName: "Dana Reyes",
                  company: "Northgate Lending",
                  nmlsNumber: "1234567",
                },
              },
            ]),
        }),
    );

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.profile).toEqual({
      displayName: "Dana Reyes",
      company: "Northgate Lending",
      nmlsNumber: "1234567",
    });
  });

  it("asks for that one preference and for no other, so the retired progress row is never read", async () => {
    let contractText = "";
    let parameters: readonly unknown[] = [];
    mocks.withTenantTransaction.mockImplementation(
      (_pool: unknown, _authority: unknown, work: (transaction: unknown) => Promise<unknown>) =>
        work({
          read: (contract: { text: string }, values: readonly unknown[]) => {
            contractText = contract.text;
            parameters = values;
            return Promise.resolve([]);
          },
        }),
    );

    await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(contractText).toContain("setup_profile.v1");
    expect(contractText).not.toContain("guided_setup.v1");
    expect(parameters).toEqual([PERSON.actorId]);
  });

  it("is no profile, and no failure, for a person who saved none", async () => {
    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.profile).toBeUndefined();
    expect(logged).not.toHaveBeenCalled();
  });

  it("treats a stored value it cannot read as no profile at all", async () => {
    mocks.withTenantTransaction.mockImplementation(
      (_pool: unknown, _authority: unknown, work: (transaction: unknown) => Promise<unknown>) =>
        work({
          read: () => Promise.resolve([{ key: "setup_profile.v1", value: { displayName: 7 } }]),
        }),
    );

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.profile).toBeUndefined();
  });
});

describe("the saved profile, when the read fails", () => {
  it("is the empty value, because a Brand form without a prefill is a form the person fills in", async () => {
    mocks.withTenantTransaction.mockRejectedValue(driverFailure());

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences).toEqual({ profile: undefined });
  });

  it("logs the error class and its code, and nothing about the person or the driver's words", async () => {
    mocks.withTenantTransaction.mockRejectedValue(driverFailure());

    await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(logged).toHaveBeenCalledTimes(1);
    const line = firstLoggedLine(logged);
    expect(line).toContain("setup-preferences");
    expect(line).toContain("Error");
    expect(line).toContain("57P01");
    expectNoPersonSessionOrDriverWords(line, PERSON);
  });

  it("is the same when the person could not be resolved", async () => {
    mocks.resolveAuthenticatedReadPrincipal.mockRejectedValue(driverFailure());

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.profile).toBeUndefined();
    expect(logged).toHaveBeenCalledTimes(1);
    expect(firstLoggedLine(logged)).toContain("57P01");
    expect(firstLoggedLine(logged)).not.toContain("dana.reyes");
  });
});

describe("the saved profile, when there is nobody to look for", () => {
  it("is the empty value, and not a failure, when nobody is signed in", async () => {
    mocks.resolveAuthenticatedReadPrincipal.mockRejectedValue(new UnauthenticatedPrincipalError());

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.profile).toBeUndefined();
    expect(logged).not.toHaveBeenCalled();
  });

  it("is the empty value in a workspace with no database behind it, without resolving anybody", async () => {
    mocks.authenticatedWorkspaceMode.mockReturnValue("synthetic");

    const preferences = await readSetupPreferencesForRequest(REQUEST, ENVIRONMENT);

    expect(preferences.profile).toBeUndefined();
    expect(mocks.resolveAuthenticatedReadPrincipal).not.toHaveBeenCalled();
    expect(logged).not.toHaveBeenCalled();
  });
});
