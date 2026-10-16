import { z } from "zod";
import {
  canonicalCampaignHash,
  freezeAuthenticatedPrincipal,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import {
  OpaqueReferenceSchema,
  WebinarPublisherCommandSchema,
  WebinarPublisherOperationSchema,
  WebinarPublisherTaskSchema,
  formatActorRef,
  formatLocationRef,
  formatInstallationRef,
  formatSessionRef,
  parseActorRef,
  parseLocationRef,
  parseInstallationRef,
  parseSessionRef,
} from "@oalo/contracts";
import type { DatabasePool, SqlScalar, DatabaseConnection } from "./sql-contract.js";

const Identity = z
  .object({
    operationRef: OpaqueReferenceSchema,
    actorId: z.uuid(),
    locationId: z.uuid(),
  })
  .strict();
const Reservation = z
  .object({
    projectionRef: OpaqueReferenceSchema,
    operation: WebinarPublisherOperationSchema,
    task: WebinarPublisherTaskSchema,
    expectedRowVersion: z.number().int().positive(),
    expectedState: z.enum([
      "reserved",
      "drafting",
      "draft_ready",
      "publish_queued",
      "publishing",
      "in_review",
      "live",
      "pause_pending",
      "paused",
      "resume_pending",
      "uncertain",
      "blocked",
      "failed",
    ]),
  })
  .strict();
const Verified = z
  .object({
    operationRef: OpaqueReferenceSchema,
    principal: z
      .object({
        actorRef: OpaqueReferenceSchema,
        actorId: z.uuid(),
        locationRef: OpaqueReferenceSchema,
        locationId: z.uuid(),
        installationRef: OpaqueReferenceSchema,
        sessionId: OpaqueReferenceSchema,
        role: z.literal("location_admin"),
        roleVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        authenticationMode: z.enum(["first_party", "embedded"]),
      })
      .strict(),
    authenticatedAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
    verificationHash: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict()
  .refine((value) => Date.parse(value.expiresAt) > Date.parse(value.authenticatedAt));
const Resolved = z
  .object({
    actorId: z.uuid(),
    locationId: z.uuid(),
    installationId: z.uuid(),
    sessionId: z.uuid(),
    role: z.literal("location_admin"),
    roleVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    authenticationMode: z.enum(["first_party", "embedded"]),
  })
  .strict();

export class WebinarPublisherAuthenticationError extends Error {
  readonly code = "PUBLISHER_AUTHENTICATION_UNAVAILABLE";
  constructor() {
    super("Original publisher command authentication is unavailable.");
  }
}
export interface WebinarPublisherCommandAuthenticationVerifier {
  /** Required trusted service: verify the actual original cookie or signed embedded token,
   * the browser mutation gate and exact request identity. No shaped claims/digest alone.
   * Return only normalized identity plus the durable verification-event digest, never a token.
   * Embedded times are the ORIGINAL signed iat/exp. Its session must be UUID-backed.
   * Rechecks are read-only: do not touch/extend sessions while DB locks are held. */
  verify(
    input: Readonly<{ operationRef: string; authenticationEvidence: unknown }>,
  ): Promise<unknown>;
  /** Existing current source/lender/approval/projection and exact final confirmation
   * against the owned persisted summary for this command, not caller-supplied summary.
   * Called before and inside the reservation transaction. No accepting default. */
  assertCommandCurrent(
    principal: Readonly<AuthenticatedPrincipal>,
    reservation: unknown,
  ): Promise<void>;
}

async function execute(
  connection: DatabaseConnection,
  name: string,
  text: string,
  values: readonly SqlScalar[] = [],
) {
  return connection.execute({
    statementName: name,
    text,
    values,
    preparedStatementMode: "unnamed",
  });
}
async function transaction<T>(
  pool: DatabasePool,
  role: "publisher_authentication_runtime" | "publisher_authentication_resolver",
  work: (connection: DatabaseConnection) => Promise<T>,
) {
  const connection = await pool.connect();
  let open = true;
  try {
    await execute(connection, "publisher-auth.begin", "begin isolation level serializable");
    await execute(connection, "publisher-auth.role", `set local role ${role}`);
    await execute(connection, "publisher-auth.limits", "set local lock_timeout='3s'");
    await execute(
      connection,
      "publisher-auth.statement-limit",
      "set local statement_timeout='10s'",
    );
    const result = await work(connection);
    await execute(connection, "publisher-auth.commit", "commit");
    open = false;
    return result;
  } catch {
    if (open) await execute(connection, "publisher-auth.rollback", "rollback");
    throw new WebinarPublisherAuthenticationError();
  } finally {
    await connection.release();
  }
}
function verifiedPrincipal(candidate: z.infer<typeof Verified>) {
  const p = freezeAuthenticatedPrincipal(candidate.principal);
  if (parseActorRef(p.actorRef) !== p.actorId || parseLocationRef(p.locationRef) !== p.locationId)
    throw new WebinarPublisherAuthenticationError();
  // Embedded sessions with synthetic names cannot acquire durable command authority.
  parseSessionRef(p.sessionId);
  parseInstallationRef(p.installationRef);
  return p;
}

/** New producer seam only. It does not replace or activate the held command repository.
 * Bind a separately provisioned capability login after independent verifier review. */
export class PostgresWebinarPublisherCommandAuthenticationRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly verifier: WebinarPublisherCommandAuthenticationVerifier,
  ) {
    if (
      typeof pool?.connect !== "function" ||
      typeof verifier?.verify !== "function" ||
      typeof verifier.assertCommandCurrent !== "function"
    )
      throw new WebinarPublisherAuthenticationError();
  }
  async reserve(input: Readonly<{ reservation: unknown; authenticationEvidence: unknown }>) {
    try {
      const reservation = Reservation.parse(input.reservation);
      const command = WebinarPublisherCommandSchema.parse({
        requestId: reservation.operation.requestId,
        projectionRef: reservation.operation.projectionRef,
        expectedProjectionHash: reservation.operation.projectionHash,
        expectedRowVersion: reservation.expectedRowVersion,
        action: reservation.operation.action,
        confirmationHash: reservation.operation.confirmationHash,
      });
      if (
        canonicalCampaignHash(command) !== reservation.operation.requestHash ||
        reservation.operation.expectedRowVersion !== reservation.expectedRowVersion
      )
        throw new WebinarPublisherAuthenticationError();
      const authentication = Verified.parse(
        await this.verifier.verify({
          operationRef: reservation.operation.operationRef,
          authenticationEvidence: input.authenticationEvidence,
        }),
      );
      const principal = verifiedPrincipal(authentication);
      if (
        authentication.operationRef !== reservation.operation.operationRef ||
        reservation.operation.actorRef !== principal.actorRef ||
        reservation.operation.locationRef !== principal.locationRef ||
        reservation.operation.actorRoleVersion !== principal.roleVersion ||
        reservation.projectionRef !== reservation.operation.projectionRef
      )
        throw new WebinarPublisherAuthenticationError();
      await this.verifier.assertCommandCurrent(principal, reservation);
      return await transaction(
        this.pool,
        "publisher_authentication_runtime",
        async (connection) => {
          const result = await execute(
            connection,
            "publisher-auth.reserve.v1",
            "select campaign.webinar_publisher_authenticated_reserve($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::timestamptz,$7::timestamptz,$8::text,$9::text::jsonb) as value",
            [
              principal.locationId,
              principal.actorId,
              parseSessionRef(principal.sessionId),
              parseInstallationRef(principal.installationRef),
              principal.authenticationMode,
              authentication.authenticatedAt,
              authentication.expiresAt,
              authentication.verificationHash,
              JSON.stringify(reservation),
            ],
          );
          if (result.rows.length !== 1) throw new WebinarPublisherAuthenticationError();
          const operation = WebinarPublisherOperationSchema.parse(
            z.object({ value: z.unknown() }).strict().parse(result.rows[0]).value,
          );
          if (
            operation.actorRef !== principal.actorRef ||
            operation.locationRef !== principal.locationRef ||
            operation.requestHash !== reservation.operation.requestHash ||
            operation.requestId !== reservation.operation.requestId ||
            operation.projectionHash !== reservation.operation.projectionHash ||
            operation.action !== reservation.operation.action
          )
            throw new WebinarPublisherAuthenticationError();
          const rechecked = Verified.parse(
            await this.verifier.verify({
              operationRef: reservation.operation.operationRef,
              authenticationEvidence: input.authenticationEvidence,
            }),
          );
          if (canonicalCampaignHash(authentication) !== canonicalCampaignHash(rechecked))
            throw new WebinarPublisherAuthenticationError();
          await this.verifier.assertCommandCurrent(principal, reservation);
          // Repeat the same local idempotent reservation to recheck original session/claim
          // expiry at commit after asynchronous verifiers. This creates no provider effect
          // and needs no extra resolver grant on the private producer capability.
          const final = await execute(
            connection,
            "publisher-auth.recheck.v1",
            "select campaign.webinar_publisher_authenticated_reserve($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::timestamptz,$7::timestamptz,$8::text,$9::text::jsonb) as value",
            [
              principal.locationId,
              principal.actorId,
              parseSessionRef(principal.sessionId),
              parseInstallationRef(principal.installationRef),
              principal.authenticationMode,
              authentication.authenticatedAt,
              authentication.expiresAt,
              authentication.verificationHash,
              JSON.stringify(reservation),
            ],
          );
          if (
            final.rows.length !== 1 ||
            canonicalCampaignHash(
              z.object({ value: z.unknown() }).strict().parse(final.rows[0]).value,
            ) !== canonicalCampaignHash(operation)
          )
            throw new WebinarPublisherAuthenticationError();
          return operation;
        },
      );
    } catch {
      throw new WebinarPublisherAuthenticationError();
    }
  }
}

/** Context-free private capability lookup, with exact immutable operation identity mandatory.
 * The old current(actorId,locationId) runtime port cannot safely call this yet. */
export class PostgresWebinarPublisherAuthenticationResolver {
  constructor(private readonly pool: DatabasePool) {
    if (typeof pool?.connect !== "function") throw new WebinarPublisherAuthenticationError();
  }
  async current(
    input: Readonly<{ operationRef: string; actorId: string; locationId: string }>,
  ): Promise<Readonly<AuthenticatedPrincipal>> {
    try {
      const identity = Identity.parse(input);
      return await transaction(
        this.pool,
        "publisher_authentication_resolver",
        async (connection) => {
          const result = await execute(
            connection,
            "publisher-auth.resolve.v1",
            "select campaign.webinar_publisher_resolve_authentication($1::text,$2::uuid,$3::uuid) as value",
            [identity.operationRef, identity.actorId, identity.locationId],
          );
          if (result.rows.length !== 1) throw new WebinarPublisherAuthenticationError();
          const row = Resolved.parse(
            z.object({ value: z.unknown() }).strict().parse(result.rows[0]).value,
          );
          if (row.actorId !== identity.actorId || row.locationId !== identity.locationId)
            throw new WebinarPublisherAuthenticationError();
          return freezeAuthenticatedPrincipal({
            actorId: row.actorId,
            actorRef: formatActorRef(row.actorId),
            locationId: row.locationId,
            locationRef: formatLocationRef(row.locationId),
            installationRef: formatInstallationRef(row.installationId),
            sessionId: formatSessionRef(row.sessionId),
            authenticationMode: row.authenticationMode,
            role: row.role,
            roleVersion: row.roleVersion,
          });
        },
      );
    } catch {
      throw new WebinarPublisherAuthenticationError();
    }
  }
  async revalidate(operationRef: string, principal: Readonly<AuthenticatedPrincipal>) {
    const current = await this.current({
      operationRef,
      actorId: principal.actorId,
      locationId: principal.locationId,
    });
    if (canonicalCampaignHash(current) !== canonicalCampaignHash(principal))
      throw new WebinarPublisherAuthenticationError();
    return current;
  }
}
