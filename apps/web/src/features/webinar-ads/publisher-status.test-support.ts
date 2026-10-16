import type { PublisherStatus } from "./publisher-status-model.js";

export function publisherStatusFixture(overrides: Partial<PublisherStatus> = {}): PublisherStatus {
  return {
    operationRef: "publishop_status01",
    campaignRef: "campaign_status01",
    campaignVersionRef: "campaignversion_status01",
    action: "publish",
    state: "publish_queued",
    campaignState: "publish_queued",
    stage: "queued",
    providerObservedAt: null,
    checkedAt: "2026-10-16T12:00:00.000Z",
    accountLabel: "Example Lending account",
    pageLabel: "Example Lending",
    headline: "Homebuying essentials",
    destination: "https://events.example.test/f/11111111-1111-4111-8111-111111111111",
    dailyBudgetMinor: 1000,
    totalBudgetMinor: 10000,
    totalSemantics: "estimated_ceiling",
    endsAt: "2026-10-20T12:00:00.000Z",
    ...overrides,
  };
}
