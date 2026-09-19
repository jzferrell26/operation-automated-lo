/**
 * PRD-005a. The review-seeding surface of the integration harness, re-exported under a `.js`
 * specifier so the route-level proofs under `apps/web/src/server/` can import it.
 *
 * `pnpm audit:boundaries` requires every relative ESM import inside `apps/` and `packages/` to end
 * in `.js`, and the harness is a `.mjs` module because it runs under `node --test`. This bridge is
 * that one extension hop and nothing else: it adds no capability, and the owner elevation the
 * seeding needs stays inside `campaign-integration-support.mjs`, which
 * `tests/security/database-privilege-escalation-boundary.test.ts` names as its only sanctioned
 * holder. Its types live in `route-seeding-bridge.d.ts`.
 */
export {
  countLocationRows,
  grantReviewBinding,
  issueReviewSession,
  readLocationCorrelationIds,
  revokeReviewBinding,
  revokeReviewSession,
  seedReviewActor,
  seedReviewLocation,
  seedReviewLocationWithoutInstallation,
} from "./campaign-integration-support.mjs";
