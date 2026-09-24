# Report share rotation: security review

Date: September 24, 2026. Base: merged PR71 (`042f4e8`). Scope: the final completion audit's share-link correction on `fix/homeowner-share-concurrency`. This is the implementing agent's security self-review, completed before the new quality review.

## Result

The audit reproduced and corrected one High finding: concurrent share-link replacements could preserve multiple usable links for the same report. No unresolved Critical or High finding remains in this correction. This result applies to the audited release and does not establish external-provider or legal acceptance.

## Finding and correction

`packages/db/src/homeowner-repository.ts:450-493` previously revoked existing rows before inserting a new share without serializing those operations across transactions. When six callers started together, the new PostgreSQL test observed five active links instead of one. A row update cannot serialize the first issuances when there is no existing share row to lock. The consequence is continued access through links that replacement was intended to revoke.

Both `createShare` and `revokeShares` now acquire the existing location-bound transaction advisory lock before reading or mutating shares. It is the same bounded, parameterized lock already used by report lookup reservations. The transaction releases it on commit or rollback; it does not survive a pooled connection's transaction. No external request occurs while this lock is held. PostgreSQL 17.6 was used for local verification.

The scope is intentionally the current workspace. Share operations in one workspace can briefly queue behind its report-reservation transaction. Tenant reads, permission checks, share expiry, hashed secrets and revocation predicates continue through their existing paths. No migration, database privilege, dependency, provider configuration or browser behavior changes.

## Boundary review

| Boundary | Result and evidence |
| --- | --- |
| Authentication and tenant authorization | The existing HTTP session/CSRF gate and tenant transaction remain authoritative. The added test rejects a foreign workspace's attempt to share the report with `NOT_FOUND`. |
| Link confidentiality and revocation | `createShare` serializes replacement; `revokeShares` uses the same lock. The concurrent regression verifies exactly one link can be read and that every issued link is unreadable after revocation. |
| Rollback and availability | A replacement whose unique-hash insertion fails rolls back its earlier revocation, leaving the original link usable. The new real-database test proves this outcome. |
| SQL and pooled connections | Only an existing parameterized transaction statement is added. Neither a browser-supplied tenant nor a session-level lock is introduced. |
| Provider usage and side effects | Sharing performs no valuation or delivery request. The concurrent test verifies the lookup counter remains unchanged. |
| Secrets and dependencies | Secret, package-boundary and product-type audits pass. A fresh dependency audit reports no known vulnerabilities. No dependency versions or credentials changed. |

## Verification

The new regression failed against the prior implementation with five active links. After the correction, all 25 homeowner/workspace PostgreSQL tests and all 28 homeowner unit tests passed. All 87 contract/security tests, type checking, lint and diff checks passed. The normal complete CI run and deployment confirmation are recorded on the corrective pull request before closeout.

## Remaining configuration

Production environment-key inspection confirmed that RentCast credentials, approved live workspace IDs and HighLevel report connection settings are absent. The transactional email pair (`OALO_RESEND_API_KEY`, `OALO_EMAIL_FROM`) is also absent; account-recovery email therefore requires configuration. The existing default-off adapters and permission checks remain in force. No actual provider request or customer message was made in this audit.
