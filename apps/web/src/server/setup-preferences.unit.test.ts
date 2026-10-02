import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLocalSyntheticPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import {
  handleSetupProfile,
  profileForStorage,
  readSetupPreferencesForRequest,
} from "./setup-preferences.js";
import {
  driverFailure,
  expectNoPersonSessionOrDriverWords,
  firstLoggedLine,
  spyOnServerLog,
  transactionWithNothingStored,
  type ServerLogSpy,
} from "./setup-preferences.test-support.js";

/**
 * PRD-009b D4 and 009B-AC-012. What is left of the setup module once the walkthrough is gone: the
 * saved profile the Brand form prefills from, and the route that writes it.
 *
 * Until 2026-10-01 the layout read the guided setup's whole state through
 * `readSetupPreferencesForRequest`, and it answered a failure with a flag the walkthrough read to tell
 * an approver that "nothing is waiting" (PRD-008b, writing review R6). Nothing asks that of this read
 * now: Home reads the campaigns that wait for an approver itself (`home-reads.ts`), and a failure to
 * read a profile costs a prefill and nothing else. So the read answers the empty value for any
 * failure, and says what kind of failure it was in the server's log, never who it happened to.
 *
 * The route keeps accepting `realtorName` and `realtorBrokerage` so a client written for the retired
 * walkthrough does not start failing, and drops them on write, so no new Realtor value is stored (an
 * ad never carries a Realtor, compliance control 9). The tenant boundary's rule stays: a body
 * carrying a location or a person is refused, not ignored. The Postgres half is
 * `setup-preferences-handler.postgres.test.ts`, which drives the exported route with real sessions.
 */

const mocks = vi.hoisted(() => ({
  withTenantTransaction: vi.fn(),
  resolveAuthenticatedPrincipal: vi.fn(),
  resolveAuthenticatedReadPrincipal: vi.fn(),
  authenticatedWorkspaceMode: vi.fn(),
}));

vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  withTenantTransaction: mocks.withTenantTransaction,
}));

vi.mock("./authenticated-principal.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authenticated-principal.js")>()),
  resolveAuthenticatedPrincipal: mocks.resolveAuthenticatedPrincipal,
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
const PROFILE = {
  displayName: "Dana Reyes",
  company: "Northgate Lending",
  nmlsNumber: "1234567",
  phone: "555 0100",
};

type Work = (transaction: unknown) => Promise<unknown>;

let logged: ServerLogSpy;

beforeEach(() => {
  mocks.withTenantTransaction.mockReset();
  mocks.resolveAuthenticatedPrincipal.mockReset();
  mocks.resolveAuthenticatedReadPrincipal.mockReset();
  mocks.authenticatedWorkspaceMode.mockReset();
  mocks.authenticatedWorkspaceMode.mockReturnValue("review");
  mocks.resolveAuthenticatedPrincipal.mockResolvedValue(PERSON);
  mocks.resolveAuthenticatedReadPrincipal.mockResolvedValue(PERSON);
  mocks.withTenantTransaction.mockImplementation(transactionWithNothingStored);
  logged = spyOnServerLog();
});

afterEach(() => {
  logged.mockRestore();
});

/** A tenant transaction that answers every read with these rows. */
function storing(rows: readonly unknown[]) {
  mocks.withTenantTransaction.mockImplementation(
    (_pool: unknown, _authority: unknown, work: Work) =>
      work({ read: () => Promise.resolve(rows) }),
  );
}

describe("the saved profile, read for the Brand form (009B-AC-012)", () => {
  it("is the profile the person saved", async () => {
    storing([
      {
        key: "setup_profile.v1",
        value: { displayName: "Dana Reyes", company: "Northgate Lending", nmlsNumber: "1234567" },
      },
    ]);

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
      (_pool: unknown, _authority: unknown, work: Work) =>
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
    storing([{ key: "setup_profile.v1", value: { displayName: 7 } }]);

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

describe("what a profile write stores (009B-AC-012)", () => {
  it("drops the two Realtor fields and keeps the rest", () => {
    expect(
      profileForStorage({
        ...PROFILE,
        realtorName: "Priya Nadeem",
        realtorBrokerage: "Northgate Realty",
      }),
    ).toEqual(PROFILE);
  });

  it("leaves a profile with no Realtor fields as it is", () => {
    expect(profileForStorage(PROFILE)).toEqual(PROFILE);
  });
});

describe("POST /api/setup/profile (009B-AC-012)", () => {
  let writes: { key: unknown; value: string }[];

  function profileRequest(body: unknown): Request {
    return new Request("https://oalo.local/api/setup/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    writes = [];
    mocks.withTenantTransaction.mockImplementation(
      (_pool: unknown, _authority: unknown, work: Work) =>
        work({
          write: (_contract: unknown, values: readonly unknown[]) => {
            writes.push({ key: values[2], value: String(values[3]) });
            return Promise.resolve([{ key: values[2] }]);
          },
        }),
    );
  });

  it("accepts a body that still carries the Realtor fields, and stores none of them", async () => {
    const response = await handleSetupProfile(
      profileRequest({
        profile: { ...PROFILE, realtorName: "Priya Nadeem", realtorBrokerage: "Northgate Realty" },
      }),
      {},
      {} as never,
    );

    expect(response.status).toBe(200);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.key).toBe("setup_profile.v1");
    expect(JSON.parse(writes[0]?.value ?? "{}")).toEqual(PROFILE);
    expect(writes[0]?.value).not.toMatch(/realtor/iu);
    await expect(response.json()).resolves.toEqual({ profile: PROFILE });
  });

  it("stores a profile that never had them, exactly as it was sent", async () => {
    const response = await handleSetupProfile(
      profileRequest({ profile: PROFILE }),
      {},
      {} as never,
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(writes[0]?.value ?? "{}")).toEqual(PROFILE);
  });

  it("refuses a body carrying the tenant boundary's own names, rather than ignoring them", async () => {
    for (const extra of [
      { locationId: "00000000-0000-4000-8000-000000000801" },
      { userId: "00000000-0000-4000-8000-000000000811" },
    ]) {
      const response = await handleSetupProfile(
        profileRequest({ profile: { ...PROFILE, ...extra } }),
        {},
        {} as never,
      );

      expect(response.status).toBe(400);
    }
    expect(writes).toEqual([]);
  });

  it("answers 404 in a workspace with no database behind it, and stores nothing", async () => {
    mocks.authenticatedWorkspaceMode.mockReturnValue("synthetic");

    const response = await handleSetupProfile(
      profileRequest({ profile: PROFILE }),
      {},
      {} as never,
    );

    expect(response.status).toBe(404);
    expect(writes).toEqual([]);
  });
});
