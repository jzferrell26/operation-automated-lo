import {
  FunnelDomainSchema,
  ownershipRecord,
  type FunnelDomain,
  type DomainState,
} from "./model.js";
/** Synthetic DNS/provider state for interaction tests, never a live verification receipt. */
export function domainFixture(patch: Partial<FunnelDomain> = {}): FunnelDomain {
  return FunnelDomainSchema.parse({
    id: "11111111-1111-4111-8111-111111111111",
    revision: "22222222-2222-4222-8222-222222222222",
    hostname: "offers.loanoffice.com",
    apex: false,
    challenge: "a".repeat(64),
    status: "ownership_needed",
    claimed: false,
    defaultKind: "buyer",
    records: [ownershipRecord("offers.loanoffice.com", "a".repeat(64))],
    checkedAt: null,
    readyUntil: null,
    challengeExpiresAt: "2035-01-01T00:00:00.000Z",
    nextCheckAt: null,
    ...patch,
  });
}
export function domainState(
  domain: FunnelDomain | null = null,
  patch: Partial<DomainState> = {},
): DomainState {
  return { available: true, canEdit: true, domain, ...patch };
}
