import {
  freezeAuthenticatedPrincipal,
  type CampaignWorkspaceReadRecord,
  type CampaignWorkspaceVersionRecord,
} from "@oalo/application";
import type { CampaignVersion, WebinarDestination } from "@oalo/contracts";
import type { CampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { WEBINAR_ADS } from "../features/webinar-ads/catalog.js";
import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import type { SavedAdBrand } from "./ad-brand-read.js";

export const WEBINAR_TEST_PRINCIPAL = freezeAuthenticatedPrincipal({
  ...createLocalSyntheticPrincipal({
    actorRef: "principal_webinaractor001",
    locationRef: "location_webinartenant001",
    installationRef: "installation_webinar001",
  }),
  authenticationMode: "embedded",
});
export const WEBINAR_TEST_BRAND: SavedAdBrand = {
  saved: true,
  band: {
    name: "Casey Rivera",
    title: "Loan officer",
    company: "Evergreen Example Lending",
    nmls: "123456",
    companyNmls: "234567",
    colorPresetId: "navy",
    disclosureLine: "Equal Housing Opportunity. Terms and conditions apply.",
  },
  leadFormWording: "By submitting, you agree to be contacted about this webinar.",
  brandProfileVersionRef: "brandprofile_webinarTest001",
  partnerNames: [],
};
export const WEBINAR_TEST_DESTINATION: WebinarDestination = {
  publicationId: "00000000-0000-4000-8000-000000000901",
  sourceRevision: "00000000-0000-4000-8000-000000000902",
  kind: "live-webinar",
  publisherActorRef: WEBINAR_TEST_PRINCIPAL.actorRef,
  snapshotHash: "a".repeat(64),
  publicUrl: "https://app.operation-automated-lo.test/f/00000000-0000-4000-8000-000000000901",
  publishedAt: "2026-10-12T12:00:00.000Z",
  expiresAt: "2030-06-20T12:00:00.000Z",
  eventStartsAt: "2030-06-12T18:00:00.000Z",
};
export const WEBINAR_TEST_INPUT = {
  requestId: "00000000-0000-4000-8000-000000000903",
  templateId: WEBINAR_ADS[0]!.id,
  templateVersion: 1,
  publicationId: WEBINAR_TEST_DESTINATION.publicationId,
  headline: WEBINAR_ADS[0]!.headline,
  primaryText: WEBINAR_ADS[0]!.primaryText,
  endsOn: "2030-06-19",
  dailyBudgetDollars: 10,
  totalBudgetDollars: 100,
  places: ["TX"],
};
/** Persistence test double retains immutable history and serializes the same aggregate seam as PostgreSQL. */
export function webinarMemoryAdapter(): CampaignPersistenceAdapter {
  const versions: CampaignVersion[] = [],
    checks = new Map<string, CampaignWorkspaceReadRecord>();
  let previous: Promise<unknown> = Promise.resolve();
  return {
    kind: "postgres",
    versionRepository: {
      run(work) {
        const next = previous.then(() =>
          work({
            async getLatestVersionNo(location, campaign) {
              return Math.max(
                0,
                ...versions
                  .filter((v) => v.locationRef === location && v.campaignRef === campaign)
                  .map((v) => v.versionNo),
              );
            },
            async getByCampaignVersionRef(location, ref) {
              return versions.find(
                (v) => v.locationRef === location && v.campaignVersionRef === ref,
              );
            },
            async append(v) {
              versions.push(v);
            },
          }),
        );
        previous = next.catch(() => undefined);
        return next;
      },
    },
    readRepository: {
      async listVersionsOf(ref) {
        return versions
          .filter((v) => v.campaignRef === ref)
          .map((v): CampaignWorkspaceVersionRecord => ({
            version: v,
            ...(checks.has(v.campaignVersionRef)
              ? { preflight: checks.get(v.campaignVersionRef)!.preflight }
              : {}),
          }));
      },
      async getByCampaignRef(ref) {
        return [...checks.values()]
          .filter((r) => r.version.campaignRef === ref)
          .sort((a, b) => b.version.versionNo - a.version.versionNo)[0];
      },
      async listForLocation() {
        return [...checks.values()];
      },
    },
    approvalRepository: {
      run: async (work) =>
        work({
          async loadCurrentEvidence() {
            return undefined;
          },
          async commitApproval() {
            throw new Error("Unrecorded preflight cannot be approved");
          },
          async recordDeniedAttempt() {},
        }),
    },
    async persistDraft(version, preflight) {
      const record: CampaignWorkspaceReadRecord = {
        version,
        preflight,
        state: preflight.blocking ? "preflight_failed" : "awaiting_approval",
        rowVersion: version.versionNo,
        updatedAt: version.createdAt,
      };
      checks.set(version.campaignVersionRef, record);
      return record;
    },
  };
}
