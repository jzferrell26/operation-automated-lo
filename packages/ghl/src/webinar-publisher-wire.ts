import { createHash } from "node:crypto";

import { canonicalizeJson } from "./canonical-json.js";

function nativeOperation<const Method extends "GET" | "PUT" | "POST">(
  method: Method,
  path: string,
) {
  return Object.freeze({ method, path, version: "v3" as const });
}
export const WEBINAR_PUBLISHER_NATIVE_OPERATIONS = Object.freeze({
  integration: nativeOperation("GET", "/ad-publishing/facebook/integration"),
  accounts: nativeOperation("GET", "/ad-publishing/facebook/ad-accounts"),
  account: nativeOperation("GET", "/ad-publishing/facebook/ad-accounts/:adAccountId"),
  pages: nativeOperation("GET", "/ad-publishing/facebook/pages"),
  geography: nativeOperation("GET", "/ad-publishing/facebook/targeting/search"),
  campaign: nativeOperation("PUT", "/ad-publishing/facebook/campaigns"),
  adset: nativeOperation("PUT", "/ad-publishing/facebook/adsets"),
  ad: nativeOperation("PUT", "/ad-publishing/facebook/ads"),
  linked: nativeOperation("GET", "/ad-publishing/facebook/campaign/:campaignId"),
  publish: nativeOperation("POST", "/ad-publishing/facebook/campaigns/:campaignId/publish"),
  progress: nativeOperation(
    "GET",
    "/ad-publishing/facebook/campaigns/:campaignId/publishing-progress",
  ),
  pause: nativeOperation("POST", "/ad-publishing/facebook/campaigns/:campaignId/pause"),
  resume: nativeOperation("POST", "/ad-publishing/facebook/campaigns/:campaignId/resume"),
  upload: nativeOperation("POST", "/medias/upload-file"),
  reporting: nativeOperation("GET", "/ad-publishing/facebook/reporting/campaign/:campaignId"),
});
// This fingerprint identifies the mapping, not permission or provider qualification.
export const WEBINAR_PUBLISHER_WIRE_MAPPING_HASH = createHash("sha256")
  .update(
    JSON.stringify(
      canonicalizeJson({
        contractId: "CTR-003",
        contractRevision: 1,
        evidenceRevision: 1,
        operations: WEBINAR_PUBLISHER_NATIVE_OPERATIONS,
        money: "USD-major-from-integer-minor",
        budgetMode: "DAILY",
        hardTotalCap: "unsupported",
        schedule: "exact-end-only-with-authorized-offset-datetime-observation",
        creative: "SINGLE-image-one-text-headline-description-LEARN_MORE-exact-public-destination",
        targeting: "HOUSING-US-region-city-manual-facebook-feed",
        documents: {
          campaign: "67936c5eba7d3fd1b2162a04b2842334aa1b985b44e46414be5c643049df79da",
          adset: "48c4d474ba010095cba5dcdf58711c61635c00d53b0404422be1b0177bb1840c",
          ad: "3e170bdf7f353751acf2e2e8606275948c0963e8ba79afbaaaa91f38ec7cd9a7",
        },
      }),
    ),
  )
  .digest("hex");
