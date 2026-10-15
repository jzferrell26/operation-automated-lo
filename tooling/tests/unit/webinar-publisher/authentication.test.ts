import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  PostgresWebinarPublisherAuthenticationResolver,
  PostgresWebinarPublisherCommandAuthenticationRepository,
  type DatabasePool,
  type SqlRequest,
} from "@oalo/db";
import {
  formatActorRef,
  formatLocationRef,
  formatInstallationRef,
  formatSessionRef,
} from "@oalo/contracts";

function fixture() {
  const calls: SqlRequest[] = [];
  const row = {
    actorId: randomUUID(),
    locationId: randomUUID(),
    installationId: randomUUID(),
    sessionId: randomUUID(),
    role: "location_admin" as const,
    roleVersion: 1,
    authenticationMode: "first_party" as const,
  };
  const principal = {
    actorRef: formatActorRef(row.actorId),
    locationRef: formatLocationRef(row.locationId),
    installationRef: formatInstallationRef(row.installationId),
    actorId: row.actorId,
    locationId: row.locationId,
    role: row.role,
    roleVersion: row.roleVersion,
    authenticationMode: row.authenticationMode,
    sessionId: formatSessionRef(row.sessionId),
  };
  const identity = {
    operationRef: "operation_original001",
    actorId: row.actorId,
    locationId: row.locationId,
  };
  const pool: DatabasePool = {
    connect: async () => ({
      execute: async (request) => {
        calls.push(request);
        return {
          rows: request.statementName === "publisher-auth.resolve.v1" ? [{ value: row }] : [],
          rowCount: request.statementName === "publisher-auth.resolve.v1" ? 1 : 0,
        };
      },
      release: async () => {},
    }),
  };
  return { calls, row, principal, identity, pool };
}
describe("private original-command authentication resolver", () => {
  it("loads the exact recorded operation before any worker admission", async () => {
    const f = fixture();
    const resolver = new PostgresWebinarPublisherAuthenticationResolver(f.pool);
    expect(await resolver.current(f.identity)).toEqual(f.principal);
    expect(f.calls.find((c) => c.statementName === "publisher-auth.resolve.v1")?.values).toEqual([
      f.identity.operationRef,
      f.identity.actorId,
      f.identity.locationId,
    ]);
    expect(f.calls.some((c) => c.text === "set local role publisher_authentication_resolver")).toBe(
      true,
    );
  });
  it("does not accept a later active login as original provenance", async () => {
    const f = fixture();
    await expect(
      new PostgresWebinarPublisherAuthenticationResolver(f.pool).revalidate(
        f.identity.operationRef,
        { ...f.principal, sessionId: formatSessionRef(randomUUID()) },
      ),
    ).rejects.toMatchObject({ code: "PUBLISHER_AUTHENTICATION_UNAVAILABLE" });
  });
  it("requires operation identity rather than arbitrary person/workspace lookup", async () => {
    const f = fixture();
    await expect(
      new PostgresWebinarPublisherAuthenticationResolver(f.pool).current({
        ...f.identity,
        operationRef: "",
      }),
    ).rejects.toMatchObject({ code: "PUBLISHER_AUTHENTICATION_UNAVAILABLE" });
    expect(f.calls).toEqual([]);
  });
  it("foreign persisted identity rolls back and never yields a principal", async () => {
    const f = fixture();
    f.row.locationId = randomUUID();
    await expect(
      new PostgresWebinarPublisherAuthenticationResolver(f.pool).current(f.identity),
    ).rejects.toMatchObject({ code: "PUBLISHER_AUTHENTICATION_UNAVAILABLE" });
    expect(f.calls.some((c) => c.text === "rollback")).toBe(true);
    expect(f.calls.some((c) => c.text === "commit")).toBe(false);
  });
  it("cannot construct a producer from a shape validator without independent authentication", () => {
    const f = fixture();
    expect(
      () =>
        new PostgresWebinarPublisherCommandAuthenticationRepository(f.pool, {
          verify: async () => ({ verified: true }),
          assertCommandCurrent: undefined!,
        }),
    ).toThrow("unavailable");
  });
});
