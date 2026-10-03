import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ADS_LIBRARY_SAMPLES_FLAG,
  adsLibrarySamplesEnabled,
  loadAdsLibrary,
} from "../../../../apps/web/src/features/ads-library/server/catalog-loader.js";
import { handleSampleArtRequest } from "../../../../apps/web/src/features/ads-library/server/sample-art-route.js";

/**
 * PRD-009c D3, 009C-AC-004. Samples load only on purpose, and the guard fails closed.
 *
 * The loader returns the sample catalog only when the flag is exactly `enabled`, the raw
 * `OALO_ENVIRONMENT` is exactly `local` (unset is not local), and no deployment-shaped signal is
 * set. Every combination below is tried with review mode on and off; exactly one shape of
 * environment returns samples, and the sample art route answers 404 in every other.
 */

const ENVIRONMENTS = ["local", "preview", "production", undefined] as const;
const FLAGS = ["enabled", "true", "Enabled", "yes", "", undefined] as const;
const DEPLOYMENT_SIGNALS: readonly (Readonly<Record<string, string>> | undefined)[] = [
  undefined,
  { VERCEL: "1" },
  { VERCEL_ENV: "preview" },
  { VERCEL_ENV: "production" },
  { OALO_RELEASE_MANIFEST_JSON: "{}" },
  { VERCEL: "" },
];
const REVIEW_MODES = [undefined, "authorized"] as const;

interface Case {
  readonly label: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly expected: boolean;
}

function cases(): Case[] {
  const all: Case[] = [];
  for (const environmentName of ENVIRONMENTS) {
    for (const flag of FLAGS) {
      for (const signal of DEPLOYMENT_SIGNALS) {
        for (const review of REVIEW_MODES) {
          const environment: Record<string, string> = {
            OALO_PROVIDER_MODE: "stub",
            OALO_SYNTHETIC_DATA_ONLY: "true",
            ...(environmentName === undefined ? {} : { OALO_ENVIRONMENT: environmentName }),
            ...(flag === undefined ? {} : { [ADS_LIBRARY_SAMPLES_FLAG]: flag }),
            ...signal,
            ...(review === undefined ? {} : { OALO_REVIEW_SURFACE: review }),
          };
          all.push({
            label: JSON.stringify(environment),
            environment,
            expected: environmentName === "local" && flag === "enabled" && signal === undefined,
          });
        }
      }
    }
  }
  return all;
}

describe("the sample guard (009C-AC-004)", () => {
  it("names the flag OALO_ADS_LIBRARY_SAMPLES", () => {
    expect(ADS_LIBRARY_SAMPLES_FLAG).toBe("OALO_ADS_LIBRARY_SAMPLES");
  });

  it("returns samples for exactly one shape of environment, in review mode or not", () => {
    const all = cases();
    expect(all.length).toBe(4 * 6 * 6 * 2);
    for (const item of all) {
      expect(adsLibrarySamplesEnabled(item.environment), item.label).toBe(item.expected);
    }
    expect(all.filter((item) => item.expected)).toHaveLength(2);
  });

  it("refuses every deployment-shaped signal even with the flag set and the environment local", () => {
    for (const signal of DEPLOYMENT_SIGNALS.filter((item) => item !== undefined)) {
      expect(
        adsLibrarySamplesEnabled({
          OALO_ENVIRONMENT: "local",
          [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
          ...signal,
        }),
        JSON.stringify(signal),
      ).toBe(false);
    }
  });

  it("reads the raw values only, never through a schema default", () => {
    // The existing schemas default an unset OALO_ENVIRONMENT to local. Read through one of them,
    // this environment would load samples; read raw, it does not.
    expect(adsLibrarySamplesEnabled({ [ADS_LIBRARY_SAMPLES_FLAG]: "enabled" })).toBe(false);

    const read: string[] = [];
    const recording = new Proxy(
      { OALO_ENVIRONMENT: "local", [ADS_LIBRARY_SAMPLES_FLAG]: "enabled" } as Record<
        string,
        string
      >,
      {
        get(target, name) {
          read.push(String(name));
          return Reflect.get(target, name);
        },
      },
    );
    expect(adsLibrarySamplesEnabled(recording)).toBe(true);
    expect([...new Set(read)].sort()).toEqual(
      [
        ADS_LIBRARY_SAMPLES_FLAG,
        "OALO_ENVIRONMENT",
        "OALO_RELEASE_MANIFEST_JSON",
        "VERCEL",
        "VERCEL_ENV",
      ].sort(),
    );
    // Non-string values (a number, an object) are not "enabled" and not "local".
    expect(
      adsLibrarySamplesEnabled({ OALO_ENVIRONMENT: "local", [ADS_LIBRARY_SAMPLES_FLAG]: 1 }),
    ).toBe(false);
    expect(adsLibrarySamplesEnabled(undefined)).toBe(false);
    expect(adsLibrarySamplesEnabled("OALO_ENVIRONMENT=local")).toBe(false);
  });

  it("keeps the guard free of any schema or configuration import", async () => {
    const source = await readFile(
      resolve(
        import.meta.dirname,
        "../../../../apps/web/src/features/ads-library/server/catalog-loader.ts",
      ),
      "utf8",
    );
    const guard = source.slice(
      source.indexOf("export function adsLibrarySamplesEnabled"),
      source.indexOf("\n}\n", source.indexOf("export function adsLibrarySamplesEnabled")),
    );
    expect(guard).not.toMatch(/parse|default|schema|z\./iu);
    expect(source).not.toMatch(/from "@oalo\/config"|authenticated-workspace-data/u);
  });

  it("loads the sample catalog only when the guard passes", async () => {
    const allowed = await loadAdsLibrary({
      environment: { OALO_ENVIRONMENT: "local", [ADS_LIBRARY_SAMPLES_FLAG]: "enabled" },
    });
    expect(allowed.samplesIncluded).toBe(true);
    expect(allowed.entries.some((item) => item.entry.sample)).toBe(true);

    const refused = await loadAdsLibrary({
      environment: {
        OALO_ENVIRONMENT: "local",
        [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
        VERCEL: "1",
      },
    });
    expect(refused.samplesIncluded).toBe(false);
    expect(refused.entries).toEqual([]);
  });

  it("answers 404 from the sample art route in every refused case, and serves art in the allowed one", async () => {
    const known = { adId: "sample-first-home", version: "2", shape: "tall" };
    for (const item of cases()) {
      const response = await handleSampleArtRequest(known, item.environment);
      expect(response.status, item.label).toBe(item.expected ? 200 : 404);
    }
  }, 60_000);
});
