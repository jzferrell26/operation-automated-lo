import {
  HomeAddressSchema,
  HomePropertySchema,
  HomeReportSchema,
  HomeValuationSchema,
  type HomeEnrollment,
  type HomeProperty,
  type HomeReport,
  type HomeReportInput,
  type HomeValuation,
} from "@oalo/contracts";
import { z } from "zod";
import { defineSqlContract, type DatabasePool, type SqlScalar } from "./sql-contract.js";
import {
  withTenantTransaction,
  type TenantContextAuthority,
  type TenantTransaction,
} from "./transaction-context.js";

export class HomeownerStoreError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "HomeownerStoreError";
  }
}
const RequestRow = z.object({
  status: z.enum(["pending", "ready", "failed", "uncertain"]),
  request_hash: z.string(),
  report_id: z.string().nullable(),
  error_code: z.string().nullable(),
});
const ReportRow = z.object({ snapshot: HomeReportSchema });
const CountRow = z.object({ count: z.number().int() });
const ChangedRow = z.object({ id: z.string() });
const isoDate = z.union([z.date(), z.string()]).transform((value) => new Date(value).toISOString());
const PropertyRow = z.object({
  id: z.string(),
  contact_id: z.string(),
  contact_name: z.string(),
  address: HomeAddressSchema,
  created_at: isoDate,
  updated_at: isoDate,
  cadence: z.enum(["off", "monthly"]),
  paused: z.boolean(),
  deliver_updates: z.boolean(),
  next_refresh_at: isoDate.nullable(),
  review_requested_at: isoDate.nullable(),
  last_error: z.string().nullable(),
  reports: z.array(HomeReportSchema),
});

function statement<Row>(
  name: string,
  access: "read" | "write",
  text: string,
  schema: z.ZodType<Row>,
) {
  return defineSqlContract({
    name: `homeowner.${name}`,
    access,
    text,
    decode: (row: unknown) => schema.parse(row),
  });
}
const lockLocation = statement(
  "lock-location",
  "write",
  "select pg_advisory_xact_lock(hashtextextended($1::text, 71829))",
  z.unknown(),
);
const readRequest = statement(
  "read-request",
  "read",
  "select status,request_hash,report_id,error_code from homeowner.lookup_requests where location_id=$1::uuid and request_id=$2::uuid",
  RequestRow,
);
const readReport = statement(
  "read-report",
  "read",
  "select snapshot from homeowner.reports where location_id=$1::uuid and id=$2",
  ReportRow,
);
const usage = statement(
  "usage",
  "read",
  "select count(*)::integer as count from homeowner.usage_events where location_id=$1::uuid and created_at >= (date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')",
  CountRow,
);
const listProperties = statement(
  "list-properties",
  "read",
  `select property.*, coalesce(history.reports,'[]'::jsonb) as reports from homeowner.properties property left join lateral (select jsonb_agg(item.snapshot order by item.created_at desc) as reports from (select snapshot,created_at from homeowner.reports where location_id=property.location_id and property_id=property.id order by created_at desc limit 120) item) history on true where property.location_id=$1::uuid and property.revoked_at is null order by property.updated_at desc limit 200`,
  PropertyRow,
);
const cachedValuation = statement(
  "cached-valuation",
  "read",
  `select report.snapshot->'valuation' as valuation from homeowner.reports report join homeowner.properties property on property.location_id=report.location_id and property.id=report.property_id where report.location_id=$1::uuid and property.address_hash=$2 and report.valuation_at>now()-interval '30 days' and property.revoked_at is null order by report.valuation_at desc limit 1`,
  z.object({ valuation: HomeValuationSchema }),
);
const propertySummaries = statement(
  "property-summaries",
  "read",
  `select property.id, property.address, property.updated_at, property.cadence, property.paused, (select count(*)::integer from homeowner.reports report where report.location_id=property.location_id and report.property_id=property.id) as report_count from homeowner.properties property where property.location_id=$1::uuid and property.revoked_at is null order by property.updated_at desc limit 200`,
  z.object({
    id: z.string(),
    address: HomeAddressSchema,
    updated_at: isoDate,
    cadence: z.enum(["off", "monthly"]),
    paused: z.boolean(),
    report_count: z.number().int().nonnegative(),
  }),
);

export interface HomeLookupReservation {
  kind: "reserved" | "existing";
  cached: HomeValuation | null;
  report: HomeReport | null;
  status: "pending" | "ready" | "failed" | "uncertain";
}
export interface ReserveHomeLookup {
  input: HomeReportInput;
  propertyId: string;
  requestHash: string;
  addressHash: string;
  monthlyLimit: number;
  refresh: boolean;
  reuseReportId?: string;
}

export class PostgresHomeownerRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly authority: TenantContextAuthority,
  ) {}
  private transaction<Result>(work: (tx: TenantTransaction) => Promise<Result>): Promise<Result> {
    return withTenantTransaction(this.pool, this.authority, work);
  }

  async list(): Promise<HomeProperty[]> {
    return this.transaction(async (tx) =>
      (await tx.read(listProperties, [tx.context.locationId])).map((row) =>
        HomePropertySchema.parse({
          id: row.id,
          contactId: row.contact_id,
          contactName: row.contact_name,
          address: row.address,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          enrollment: {
            cadence: row.cadence,
            paused: row.paused,
            deliverUpdates: row.deliver_updates,
            nextRefreshAt: row.next_refresh_at,
          },
          reports: row.reports,
          reviewRequestedAt: row.review_requested_at,
          lastError: row.last_error,
        }),
      ),
    );
  }
  async getReport(id: string): Promise<HomeReport | null> {
    return this.transaction(
      async (tx) => (await tx.read(readReport, [tx.context.locationId, id]))[0]?.snapshot ?? null,
    );
  }
  /** Workspace navigation needs property metadata, never every financial snapshot. */
  async summaries() {
    return this.transaction(async (tx) =>
      (await tx.read(propertySummaries, [tx.context.locationId])).map((row) => ({
        id: row.id,
        address: row.address,
        updatedAt: row.updated_at,
        reportCount: row.report_count,
        monthly: row.cadence === "monthly",
        paused: row.paused,
      })),
    );
  }
  async usage(): Promise<number> {
    return this.transaction(
      async (tx) => (await tx.read(usage, [tx.context.locationId]))[0]?.count ?? 0,
    );
  }
  async ghlLocation(): Promise<string | null> {
    return this.transaction(
      async (tx) =>
        (
          await tx.read(
            statement(
              "ghl-location",
              "read",
              "select ghl_location_id from platform.locations where id=$1::uuid",
              z.object({ ghl_location_id: z.string().nullable() }),
            ),
            [tx.context.locationId],
          )
        )[0]?.ghl_location_id ?? null,
    );
  }

  async reserve(options: ReserveHomeLookup): Promise<HomeLookupReservation> {
    return this.transaction(async (tx) => {
      const location = tx.context.locationId;
      await tx.write(lockLocation, [location]);
      const previous = (await tx.read(readRequest, [location, options.input.requestId]))[0];
      if (previous) {
        if (previous.request_hash !== options.requestHash)
          throw new HomeownerStoreError("IDEMPOTENCY_CONFLICT");
        const report = previous.report_id
          ? ((await tx.read(readReport, [location, previous.report_id]))[0]?.snapshot ?? null)
          : null;
        return { kind: "existing", status: previous.status, report, cached: null };
      }
      if (
        ((
          await tx.read(
            statement(
              "prior-usage",
              "read",
              "select count(*)::integer as count from homeowner.usage_events where location_id=$1::uuid and request_id=$2::uuid",
              CountRow,
            ),
            [location, options.input.requestId],
          )
        )[0]?.count ?? 0) > 0
      )
        throw new HomeownerStoreError("LOOKUP_ALREADY_ATTEMPTED");
      const existing = (
        await tx.read(
          statement(
            "property-binding",
            "read",
            "select contact_id,address_hash from homeowner.properties where location_id=$1::uuid and id=$2 and revoked_at is null",
            z.object({ contact_id: z.string(), address_hash: z.string() }),
          ),
          [location, options.propertyId],
        )
      )[0];
      if (options.input.propertyId && !existing) throw new HomeownerStoreError("NOT_FOUND");
      if (
        existing &&
        (existing.contact_id !== options.input.contactId ||
          existing.address_hash !== options.addressHash)
      )
        throw new HomeownerStoreError("PROPERTY_CONFLICT");
      const pending =
        (
          await tx.read(
            statement(
              "pending-lookup",
              "read",
              "select count(*)::integer as count from homeowner.lookup_requests where location_id=$1::uuid and property_id=$2 and status='pending'",
              CountRow,
            ),
            [location, options.propertyId],
          )
        )[0]?.count ?? 0;
      if (pending) throw new HomeownerStoreError("LOOKUP_PENDING");
      let cached: HomeValuation | null = null;
      if (options.reuseReportId) {
        const report = (await tx.read(readReport, [location, options.reuseReportId]))[0]?.snapshot;
        if (!report || report.propertyId !== options.propertyId)
          throw new HomeownerStoreError("NOT_FOUND");
        cached = report.valuation;
      } else if (!options.refresh)
        cached =
          (await tx.read(cachedValuation, [location, options.addressHash]))[0]?.valuation ?? null;
      if (!cached && ((await tx.read(usage, [location]))[0]?.count ?? 0) >= options.monthlyLimit)
        throw new HomeownerStoreError("LOOKUP_LIMIT");
      if (!existing) {
        const count =
          (
            await tx.read(
              statement(
                "property-count",
                "read",
                "select count(*)::integer as count from homeowner.properties where location_id=$1::uuid",
                CountRow,
              ),
              [location],
            )
          )[0]?.count ?? 0;
        if (count >= 200) throw new HomeownerStoreError("PROPERTY_LIMIT");
        await tx.write(
          statement(
            "insert-property",
            "write",
            `insert into homeowner.properties(id,location_id,created_by,contact_id,contact_name,address,address_hash,communication_basis) values($1,$2::uuid,$3::uuid,$4,$5,$6::text::jsonb,$7,$8) returning id`,
            ChangedRow,
          ),
          [
            options.propertyId,
            location,
            tx.context.actorId,
            options.input.contactId,
            options.input.contactName,
            JSON.stringify(options.input.address),
            options.addressHash,
            options.input.communicationBasis,
          ],
        );
      }
      await tx.write(
        statement(
          "reserve-lookup",
          "write",
          `insert into homeowner.lookup_requests(location_id,request_id,property_id,request_hash,status,attempted) values($1::uuid,$2::uuid,$3,$4,'pending',$5) returning property_id as id`,
          ChangedRow,
        ),
        [
          location,
          options.input.requestId,
          options.propertyId,
          options.requestHash,
          cached === null,
        ],
      );
      if (cached === null)
        await tx.write(
          statement(
            "reserve-usage",
            "write",
            "insert into homeowner.usage_events(location_id,request_id) values($1::uuid,$2::uuid) returning request_id::text as id",
            ChangedRow,
          ),
          [location, options.input.requestId],
        );
      return { kind: "reserved", status: "pending", report: null, cached };
    });
  }

  async complete(report: HomeReport): Promise<void> {
    const parsed = HomeReportSchema.parse(report);
    await this.transaction(async (tx) => {
      const location = tx.context.locationId;
      const reservation = (
        await tx.write(
          statement(
            "lock-lookup",
            "write",
            "select status,request_hash,report_id,error_code from homeowner.lookup_requests where location_id=$1::uuid and request_id=$2::uuid for update",
            RequestRow,
          ),
          [location, parsed.input.requestId],
        )
      )[0];
      if (reservation?.status === "ready" && reservation.report_id === parsed.id) return;
      if (reservation?.status !== "pending") throw new HomeownerStoreError("LOOKUP_NOT_PENDING");
      await tx.write(
        statement(
          "insert-report",
          "write",
          `insert into homeowner.reports(id,location_id,property_id,snapshot,valuation_at,created_by) values($1,$2::uuid,$3,$4::text::jsonb,$5::timestamptz,$6::uuid) on conflict(location_id,id) do nothing returning id`,
          ChangedRow,
        ),
        [
          parsed.id,
          location,
          parsed.propertyId,
          JSON.stringify(parsed),
          parsed.valuation.retrievedAt,
          tx.context.actorId,
        ],
      );
      await tx.write(
        statement(
          "complete-lookup",
          "write",
          `update homeowner.lookup_requests set status='ready',report_id=$3,updated_at=now() where location_id=$1::uuid and request_id=$2::uuid and status='pending' returning property_id as id`,
          ChangedRow,
        ),
        [location, parsed.input.requestId, parsed.id],
      );
      await tx.write(
        statement(
          "touch-property",
          "write",
          `update homeowner.properties set last_error=null,updated_at=now(),contact_name=$3 where location_id=$1::uuid and id=$2 returning id`,
          ChangedRow,
        ),
        [location, parsed.propertyId, parsed.input.contactName],
      );
    });
  }
  async fail(
    requestId: string,
    propertyId: string,
    code: string,
    uncertain: boolean,
  ): Promise<void> {
    await this.transaction(async (tx) => {
      await tx.write(
        statement(
          "fail-lookup",
          "write",
          `update homeowner.lookup_requests set status=$3,error_code=$4,updated_at=now() where location_id=$1::uuid and request_id=$2::uuid and status='pending' returning property_id as id`,
          ChangedRow,
        ),
        [tx.context.locationId, requestId, uncertain ? "uncertain" : "failed", code],
      );
      await tx.write(
        statement(
          "flag-property",
          "write",
          `update homeowner.properties set last_error=$3,updated_at=now() where location_id=$1::uuid and id=$2 returning id`,
          ChangedRow,
        ),
        [tx.context.locationId, propertyId, code],
      );
    });
  }
  async enrollment(propertyId: string, enrollment: HomeEnrollment): Promise<void> {
    await this.transaction(async (tx) => {
      const rows = await tx.write(
        statement(
          "enrollment",
          "write",
          `update homeowner.properties set cadence=$3,paused=$4,deliver_updates=$5,next_refresh_at=$6::timestamptz,lease_until=null,updated_at=now() where location_id=$1::uuid and id=$2 and revoked_at is null returning id`,
          ChangedRow,
        ),
        [
          tx.context.locationId,
          propertyId,
          enrollment.cadence,
          enrollment.paused,
          enrollment.deliverUpdates,
          enrollment.nextRefreshAt,
        ],
      );
      if (!rows.length) throw new HomeownerStoreError("NOT_FOUND");
    });
  }
  async shares(reportId: string): Promise<{ id: string; expiresAt: string; revoked: boolean }[]> {
    return this.transaction(async (tx) =>
      (
        await tx.read(
          statement(
            "list-shares",
            "read",
            `select id::text,expires_at,revoked_at is not null as revoked from homeowner.shares where location_id=$1::uuid and report_id=$2 order by created_at desc limit 10`,
            z.object({ id: z.string(), expires_at: isoDate, revoked: z.boolean() }),
          ),
          [tx.context.locationId, reportId],
        )
      ).map((row) => ({ id: row.id, expiresAt: row.expires_at, revoked: row.revoked })),
    );
  }
  async createShare(reportId: string, hash: string, expiresAt: string): Promise<string> {
    return this.transaction(async (tx) => {
      // Rotation and revocation must share a database lock across tabs and servers,
      // including when no link exists yet for an UPDATE to lock.
      await tx.write(lockLocation, [tx.context.locationId]);
      const report = (await tx.read(readReport, [tx.context.locationId, reportId]))[0]?.snapshot;
      if (!report) throw new HomeownerStoreError("NOT_FOUND");
      await tx.write(
        statement(
          "revoke-report-shares",
          "write",
          `update homeowner.shares set revoked_at=now() where location_id=$1::uuid and report_id=$2 and revoked_at is null returning id::text`,
          ChangedRow,
        ),
        [tx.context.locationId, reportId],
      );
      const row = (
        await tx.write(
          statement(
            "create-share",
            "write",
            `insert into homeowner.shares(location_id,report_id,secret_hash,created_by,expires_at) values($1::uuid,$2,$3,$4::uuid,$5::timestamptz) returning id::text`,
            ChangedRow,
          ),
          [tx.context.locationId, reportId, hash, tx.context.actorId, expiresAt],
        )
      )[0];
      if (!row) throw new HomeownerStoreError("WRITE_FAILED");
      return row.id;
    });
  }
  async revokeShares(propertyId: string): Promise<void> {
    await this.transaction(async (tx) => {
      await tx.write(lockLocation, [tx.context.locationId]);
      await tx.write(
        statement(
          "revoke-shares",
          "write",
          `update homeowner.shares share set revoked_at=now() from homeowner.reports report where share.location_id=$1::uuid and share.location_id=report.location_id and share.report_id=report.id and report.property_id=$2 returning share.id::text`,
          ChangedRow,
        ),
        [tx.context.locationId, propertyId],
      );
    });
  }
  async resolveReview(propertyId: string): Promise<void> {
    await this.transaction(async (tx) => {
      await tx.write(
        statement(
          "resolve-review",
          "write",
          `update homeowner.properties set review_requested_at=null,updated_at=now() where location_id=$1::uuid and id=$2 returning id`,
          ChangedRow,
        ),
        [tx.context.locationId, propertyId],
      );
    });
  }
  async remove(propertyId: string): Promise<void> {
    await this.transaction(async (tx) => {
      await tx.write(
        statement(
          "remove-property",
          "write",
          `delete from homeowner.properties where location_id=$1::uuid and id=$2 returning id`,
          ChangedRow,
        ),
        [tx.context.locationId, propertyId],
      );
    });
  }
  async reserveDelivery(reportId: string): Promise<boolean> {
    return this.transaction(
      async (tx) =>
        (
          await tx.write(
            statement(
              "reserve-delivery",
              "write",
              `insert into homeowner.deliveries(location_id,report_id,contact_id,status) select report.location_id,report.id,property.contact_id,'pending' from homeowner.reports report join homeowner.properties property on property.location_id=report.location_id and property.id=report.property_id where report.location_id=$1::uuid and report.id=$2 on conflict do nothing returning report_id as id`,
              ChangedRow,
            ),
            [tx.context.locationId, reportId],
          )
        ).length > 0,
    );
  }
  async closeInterruptedLookup(propertyId: string): Promise<number> {
    return this.transaction(async (tx) => {
      await tx.write(lockLocation, [tx.context.locationId]);
      const recent =
        (
          await tx.read(
            statement(
              "active-lookup",
              "read",
              `select count(*)::integer as count from homeowner.lookup_requests where location_id=$1::uuid and property_id=$2 and status='pending' and created_at>now()-interval '5 minutes'`,
              CountRow,
            ),
            [tx.context.locationId, propertyId],
          )
        )[0]?.count ?? 0;
      if (recent > 0) throw new HomeownerStoreError("LOOKUP_STILL_ACTIVE");
      const rows = await tx.write(
        statement(
          "close-interrupted-lookup",
          "write",
          `update homeowner.lookup_requests set status='uncertain',error_code='LOOKUP_INTERRUPTED',updated_at=now() where location_id=$1::uuid and property_id=$2 and status='pending' and created_at<=now()-interval '5 minutes' returning property_id as id`,
          ChangedRow,
        ),
        [tx.context.locationId, propertyId],
      );
      return rows.length;
    });
  }
  async acknowledgeDeliveryHold(reportId: string): Promise<void> {
    await this.transaction(async (tx) => {
      const active =
        (
          await tx.read(
            statement(
              "active-delivery",
              "read",
              `select count(*)::integer as count from homeowner.deliveries where location_id=$1::uuid and report_id=$2 and status='pending' and created_at>now()-interval '5 minutes'`,
              CountRow,
            ),
            [tx.context.locationId, reportId],
          )
        )[0]?.count ?? 0;
      if (active) throw new HomeownerStoreError("DELIVERY_STILL_ACTIVE");
      await tx.write(
        statement(
          "acknowledge-delivery",
          "write",
          `update homeowner.deliveries set status='blocked',detail_code='HUMAN_REVIEWED',updated_at=now() where location_id=$1::uuid and report_id=$2 and (status='uncertain' or (status='pending' and created_at<=now()-interval '5 minutes')) returning report_id as id`,
          ChangedRow,
        ),
        [tx.context.locationId, reportId],
      );
    });
  }
  async finishDelivery(
    reportId: string,
    status: "sent" | "blocked" | "uncertain",
    code: string | null,
    shareId: string | null,
  ): Promise<void> {
    await this.transaction(async (tx) => {
      await tx.write(
        statement(
          "finish-delivery",
          "write",
          `update homeowner.deliveries set status=$3,detail_code=$4,share_id=$5::uuid,updated_at=now() where location_id=$1::uuid and report_id=$2 returning report_id as id`,
          ChangedRow,
        ),
        [tx.context.locationId, reportId, status, code, shareId],
      );
    });
  }
  async delivery(reportId: string): Promise<{ status: string; detailCode: string | null } | null> {
    return this.transaction(async (tx) => {
      const row = (
        await tx.read(
          statement(
            "read-delivery",
            "read",
            `select status,detail_code from homeowner.deliveries where location_id=$1::uuid and report_id=$2`,
            z.object({ status: z.string(), detail_code: z.string().nullable() }),
          ),
          [tx.context.locationId, reportId],
        )
      )[0];
      return row ? { status: row.status, detailCode: row.detail_code } : null;
    });
  }
  async advanceSchedule(
    propertyId: string,
    expectedDue: string,
    nextDue: string | null,
    errorCode: string | null,
  ): Promise<void> {
    await this.transaction(async (tx) => {
      await tx.write(
        statement(
          "advance-schedule",
          "write",
          `update homeowner.properties set next_refresh_at=$4::timestamptz,paused=($5::text is not null),last_error=$5,lease_until=null,updated_at=now() where location_id=$1::uuid and id=$2 and next_refresh_at=$3::timestamptz and cadence='monthly' and not paused returning id`,
          ChangedRow,
        ),
        [tx.context.locationId, propertyId, expectedDue, nextDue, errorCode],
      );
    });
  }
}

/** Only the three fixed capability functions below can be invoked without a user session. */
async function capabilityQuery(
  pool: DatabasePool,
  name: "read-share" | "record-event" | "claim-due",
  values: readonly SqlScalar[],
): Promise<readonly unknown[]> {
  const connection = await pool.connect();
  const text =
    name === "read-share"
      ? "select homeowner.read_shared_report($1) as snapshot"
      : name === "record-event"
        ? "select homeowner.record_shared_event($1,$2,$3::uuid) as accepted"
        : "select * from homeowner.claim_due_properties($1::integer)";
  try {
    await connection.execute({
      statementName: "homeowner.capability-begin",
      text: "begin",
      values: [],
      preparedStatementMode: "unnamed",
    });
    await connection.execute({
      statementName: "homeowner.capability-role",
      text:
        name === "claim-due" ? "set local role scheduler_runtime" : "set local role app_runtime",
      values: [],
      preparedStatementMode: "unnamed",
    });
    const result = await connection.execute({
      statementName: `homeowner.${name}`,
      text,
      values,
      preparedStatementMode: "unnamed",
    });
    await connection.execute({
      statementName: "homeowner.capability-commit",
      text: "commit",
      values: [],
      preparedStatementMode: "unnamed",
    });
    return result.rows;
  } catch (error) {
    await connection.execute({
      statementName: "homeowner.capability-rollback",
      text: "rollback",
      values: [],
      preparedStatementMode: "unnamed",
    });
    throw error;
  } finally {
    await connection.release();
  }
}
export async function readSharedHomeReport(
  pool: DatabasePool,
  hash: string,
): Promise<HomeReport | null> {
  z.string()
    .regex(/^[a-f0-9]{64}$/u)
    .parse(hash);
  const result = await capabilityQuery(pool, "read-share", [hash]);
  return z.object({ snapshot: HomeReportSchema.nullable() }).parse(result[0]).snapshot;
}
export async function recordSharedHomeEvent(
  pool: DatabasePool,
  hash: string,
  kind: "viewed" | "review_requested",
  key: string,
): Promise<boolean> {
  z.string()
    .regex(/^[a-f0-9]{64}$/u)
    .parse(hash);
  z.uuid().parse(key);
  return z
    .object({ accepted: z.boolean() })
    .parse((await capabilityQuery(pool, "record-event", [hash, kind, key]))[0]).accepted;
}
export async function claimDueHomeProperties(
  pool: DatabasePool,
): Promise<{ locationId: string; propertyId: string; actorId: string }[]> {
  return (await capabilityQuery(pool, "claim-due", [5])).map((value) => {
    const row = z
      .object({ location_id: z.uuid(), property_id: z.string(), actor_id: z.uuid() })
      .parse(value);
    return { locationId: row.location_id, propertyId: row.property_id, actorId: row.actor_id };
  });
}
