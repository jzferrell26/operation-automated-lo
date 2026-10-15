import { describe, expect, it } from "vitest";
import { WebinarPublisherAdmissionSchema } from "@oalo/db";
import { publisherFixture } from "../../../../packages/db/test/webinar-publisher-fixture.mjs";

describe("verified draft readback admission shape", () => {
  it.each(["drafting", "draft_ready"])(
    "accepts truthful %s while retaining strict normalization",
    (state) => {
      const f = publisherFixture();
      const receipt = {
        ...f.receipt,
        kind: "observation",
        normalized: {
          projectionHash: f.operation.projectionHash,
          nativeIds: {
            campaignId: "native_draft001",
            adsetId: "native_adset001",
            adId: "native_ad001",
          },
          state,
          readBackHash: "a".repeat(64),
          observedAt: f.receipt.observedAt,
          facebookIds: { campaignId: null, adsetId: null, adId: null },
          metrics: { impressions: null, clicks: null, spendMinor: null },
        },
      };
      expect(WebinarPublisherAdmissionSchema.safeParse(receipt).success).toBe(true);
      expect(
        WebinarPublisherAdmissionSchema.safeParse({
          ...receipt,
          normalized: { ...receipt.normalized, accessToken: "not-persisted" },
        }).success,
      ).toBe(false);
      expect(
        WebinarPublisherAdmissionSchema.safeParse({
          ...receipt,
          observedAt: new Date(Date.parse(receipt.observedAt) - 1).toISOString(),
        }).success,
      ).toBe(false);
      expect(
        WebinarPublisherAdmissionSchema.safeParse({
          ...receipt,
          normalized: { ...receipt.normalized, state: "live" },
        }).success,
      ).toBe(false);
    },
  );
});
