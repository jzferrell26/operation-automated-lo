import { describe, expect, it } from "vitest";
import { z } from "zod";

import { GET } from "../../../apps/web/src/app/api/health/live/route.js";

const healthResponseSchema = z
  .object({
    status: z.literal("ok"),
    phase: z.literal("phase-0-evidence-harness"),
    productionTrafficEnabled: z.literal(false),
  })
  .strict();

describe("preview-safe health route", () => {
  it("returns safe scaffold state without dependency or feature traffic", async () => {
    const response = GET();
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(body)).toEqual({
      status: "ok",
      phase: "phase-0-evidence-harness",
      productionTrafficEnabled: false,
    });
  });
});
