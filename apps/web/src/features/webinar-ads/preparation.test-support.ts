import type { WebinarContext } from "./preparation-model.js";
const publicationId = "00000000-0000-4000-8000-000000000901";
export const WEBINAR_CONTEXT_FIXTURE: WebinarContext = {
  canPrepare: true,
  brand: {
    saved: true,
    band: {
      name: "Casey Rivera",
      title: "Loan officer",
      company: "Evergreen Example Lending",
      nmls: "123456",
      companyNmls: "234567",
      colorPresetId: "navy",
      disclosureLine: "Equal Housing Opportunity.",
    },
    leadFormWording: "You agree to be contacted about this webinar.",
  },
  providerEnabled: false,
  destinations: [
    {
      title: "Your homebuying plan",
      learningSummary: "Planning, budget and the path to closing.",
      destination: {
        publicationId,
        kind: "live-webinar",
        sourceRevision: "00000000-0000-4000-8000-000000000902",
        publisherActorRef: "principal_example001",
        snapshotHash: "a".repeat(64),
        publicUrl: "https://example.test/f/" + publicationId,
        publishedAt: "2026-10-12T12:00:00.000Z",
        expiresAt: "2030-06-20T12:00:00.000Z",
        eventStartsAt: "2030-06-12T18:00:00.000Z",
      },
    },
  ],
};
