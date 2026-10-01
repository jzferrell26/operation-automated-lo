import { describe, expect, it } from "vitest";

import { GET } from "./route.js";

const INVALID_ENVIRONMENT: Readonly<Record<string, string>> = Object.freeze({
  OALO_ENVIRONMENT: "preview",
});

const VALID_LOCAL_ENVIRONMENT: Readonly<Record<string, string>> = Object.freeze({
  OALO_ENVIRONMENT: "local",
});

describe("GET /api/version", () => {
  /**
   * PRD-008a D4 (008A-AC-019, amending 005E-AC-003). The route answers every caller, signed in or
   * not, so it returns only what the deployed proof reads: the environment, the build id, and the
   * commit. The contract version, the phase, and the release manifest's versions are no longer
   * returned to anybody.
   */
  it("returns only environment, buildId, and commit for a valid environment", async () => {
    const originalEnv = process.env;
    process.env = VALID_LOCAL_ENVIRONMENT as unknown as NodeJS.ProcessEnv;

    try {
      const response = GET();
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");

      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toEqual({ environment: "local", buildId: "local", commit: "local" });
    } finally {
      process.env = originalEnv;
    }
  });

  it("returns a handled 503 when the runtime environment fails to parse", async () => {
    const originalEnv = process.env;
    process.env = INVALID_ENVIRONMENT as unknown as NodeJS.ProcessEnv;

    try {
      const response = GET();
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");

      const body = (await response.json()) as { status: string; code: string };
      expect(body).toEqual({ status: "unavailable", code: "CONFIGURATION_INVALID" });

      const bodyText = JSON.stringify(body);
      expect(bodyText).not.toMatch(/OALO_/);
      expect(bodyText).not.toMatch(/environment/i);
      expect(bodyText).not.toMatch(/parse/i);
    } finally {
      process.env = originalEnv;
    }
  });
});
