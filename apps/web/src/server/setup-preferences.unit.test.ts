import { beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { handleSetupProfile, profileForStorage } from "./setup-preferences.js";

/**
 * PRD-009b D4 and 009B-AC-012, the profile route's write.
 *
 * The route keeps accepting `realtorName` and `realtorBrokerage` so a client written for the
 * retired walkthrough does not start failing, and drops them on write, so no new Realtor value is
 * stored (an ad never carries a Realtor, compliance control 9). The tenant boundary's rule stays:
 * a body carrying a location or a person is refused, not ignored. The Postgres half is
 * `setup-preferences-handler.postgres.test.ts`, which drives the exported route with real sessions.
 */

const mocks = vi.hoisted(() => ({
  withTenantTransaction: vi.fn(),
  resolveAuthenticatedPrincipal: vi.fn(),
  authenticatedWorkspaceMode: vi.fn(),
}));

vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  withTenantTransaction: mocks.withTenantTransaction,
}));

vi.mock("./authenticated-principal.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authenticated-principal.js")>()),
  resolveAuthenticatedPrincipal: mocks.resolveAuthenticatedPrincipal,
}));

vi.mock("./authenticated-workspace-data.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authenticated-workspace-data.js")>()),
  authenticatedWorkspaceMode: mocks.authenticatedWorkspaceMode,
}));

vi.mock("./campaign-persistence-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => ({}),
}));

const PERSON = createLocalSyntheticPrincipal({ role: "location_admin" });
const PROFILE = {
  displayName: "Dana Reyes",
  company: "Northgate Lending",
  nmlsNumber: "1234567",
  phone: "555 0100",
};

function profileRequest(body: unknown): Request {
  return new Request("https://oalo.local/api/setup/profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

let writes: { key: unknown; value: string }[];

beforeEach(() => {
  writes = [];
  mocks.withTenantTransaction.mockReset();
  mocks.resolveAuthenticatedPrincipal.mockReset();
  mocks.authenticatedWorkspaceMode.mockReset();
  mocks.authenticatedWorkspaceMode.mockReturnValue("review");
  mocks.resolveAuthenticatedPrincipal.mockResolvedValue(PERSON);
  mocks.withTenantTransaction.mockImplementation(
    (_pool: unknown, _authority: unknown, work: (transaction: unknown) => Promise<unknown>) =>
      work({
        write: (_contract: unknown, values: readonly unknown[]) => {
          writes.push({ key: values[2], value: String(values[3]) });
          return Promise.resolve([{ key: values[2] }]);
        },
      }),
  );
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
