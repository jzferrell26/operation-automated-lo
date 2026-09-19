import { CorrelationReferenceSchema } from "@oalo/contracts";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST } from "../app/api/campaigns/preflight/route.js";
import {
  CORRELATION_HEADER_MATRIX,
  OPEN_HOUSE_DRAFT_INPUT,
} from "./campaign-command-test-support.js";
import {
  AUDIT_TABLE,
  COMMAND_TABLE,
  applyRouteEnvironment,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  issueSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  storedCorrelationIds,
  type IssuedSession,
  type RoutePostgresEnvironment,
  type SeededActor,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";
import { CORRELATION_REFERENCE_HEADER, TRACING_ID_HEADER } from "./correlation-boundary.js";

/**
 * PRD-005c 005C-AC-008. The same `x-correlation-id` matrix as the approve route, run against the
 * preflight route with a creator session. Every case must persist and answer 200: the header's
 * shape is a tracing concern and has no say in whether a command executes.
 */

const environment: RoutePostgresEnvironment = routeEnvironment();

let pool: PostgresDatabasePool;
let location: SeededLocation;
let creator: SeededActor;
let creatorSession: IssuedSession;
let csrfServerSecret: Uint8Array;
let restoreEnvironment: () => void;

beforeAll(async () => {
  restoreEnvironment = applyRouteEnvironment(environment);
  pool = createRouteTestPool();
  csrfServerSecret = csrfSecretFor(environment);
  location = await seedLocation(pool, "Correlation preflight location");
  creator = await seedActor(pool, location, {
    displayName: "Correlation preflight creator",
    bindingRole: "creator",
    sessionRole: "campaign_creator",
  });
  creatorSession = await issueSession(pool, location, creator);
});

afterAll(async () => {
  await pool.close();
  restoreEnvironment();
});

describe("campaign preflight handler correlation matrix (real Postgres)", () => {
  it.each(CORRELATION_HEADER_MATRIX)(
    "persists with a canonical response reference for %s",
    async (_label, header) => {
      const response = await POST(
        browserRequest({
          path: "/api/campaigns/preflight",
          body: OPEN_HOUSE_DRAFT_INPUT,
          session: creatorSession,
          csrfServerSecret,
          ...(header === undefined ? {} : { correlationId: header }),
        }),
      );

      expect(response.status).toBe(200);
      const canonical = response.headers.get(CORRELATION_REFERENCE_HEADER);
      expect(canonical).toMatch(/^correlation_preflight_[0-9a-f]{24}$/u);
      expect(CorrelationReferenceSchema.safeParse(canonical).success).toBe(true);
      expect(canonical).not.toBe(header);

      const echoed = response.headers.get(TRACING_ID_HEADER);
      if (header !== undefined && header.length <= 300) {
        expect(echoed).toBe(header);
      } else {
        expect(echoed).toBeNull();
      }

      for (const table of [COMMAND_TABLE, AUDIT_TABLE]) {
        for (const stored of await storedCorrelationIds(pool, table, location.locationId)) {
          expect(CorrelationReferenceSchema.safeParse(stored).success).toBe(true);
        }
      }
    },
  );
});
