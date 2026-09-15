# PRD-003d: Authenticated Product Activation - Workspace Reads

> **Parent:** [PRD-003](./prd-003-authenticated-product-activation-index.md)
> **Status:** In Work
> **Priority:** P0
> **Schema changes:** None beyond PRD-003a

## Goal

Make the authenticated product surface render real tenant-backed campaign state so the user can create a campaign, return later, find it in the workspace, review its lifecycle, and approve it without relying on synthetic fixtures or a process-local filesystem store.

## Scope

- Wire `/marketing/campaigns/new` to PRD-003a persistence through the authenticated command context.
- Wire `/marketing/campaigns/[campaignRef]` to persisted campaign/version/preflight/approval data.
- Add a tenant-scoped campaign list/read model for overview/navigation surfaces.
- Replace direct synthetic fixture imports on authenticated campaign/overview paths where persisted data now exists.
- Preserve dedicated demo/synthetic pages as explicitly synthetic surfaces.
- Define empty, loading, blocked, preflight-failed, awaiting-approval, approved, and inaccessible states.

## Non-Goals

- Full reporting replacement for every synthetic reporting fixture in the product.
- Provider status/spend reporting before G3 is authorized.
- New public page publishing behavior.
- Generic dashboard customization.

## User stories

### US-003D.1 - Resume a campaign later

**As a** campaign creator, **I want** my saved campaigns visible after a restart or new session, **so that** the product behaves like a durable application rather than a demo.

Acceptance criteria:

- `003D-AC-001`: campaign creation returns a persisted campaign reference and navigates to the real detail route.
- `003D-AC-002`: refreshing or restarting the web process retains the campaign because the source is Postgres.
- `003D-AC-003`: the authenticated overview or marketing workspace lists only campaigns in the verified location.
- `003D-AC-004`: an inaccessible campaign ref returns a non-enumerating not-found/forbidden experience without leaking cross-tenant metadata.

### US-003D.2 - Understand current lifecycle state

**As a** user reviewing a campaign, **I want** the exact current state and evidence visible, **so that** I know what action is legitimately available next.

Acceptance criteria:

- `003D-AC-005`: preflight-failed detail displays blocking findings and remediation from persisted evidence.
- `003D-AC-006`: awaiting-approval detail displays immutable version evidence and only exposes approval action to an authorized approver.
- `003D-AC-007`: approved detail displays who approved, when, and the safe evidence summary without exposing raw audit-sensitive metadata.
- `003D-AC-008`: no UI control implies provider publication is available until the separate provider gates are authorized.

## Read model

Use a server-side application query/read repository that returns a safe campaign projection for UI rendering. Do not hand raw SQL rows or unrestricted JSONB manifests directly to Client Components.

Suggested projection fields:

- campaign ref and current state
- current campaign-version ref and version number
- property address/open-house dates
- Realtor display name for collateral context
- budget and Housing Special Ad Category summary
- preflight blocking status and safe findings
- approval summary if present
- last-updated timestamp
- available next actions derived server-side from role + state

## Files expected to change

- `apps/web/src/server/authenticated-workspace-data.ts`
- `apps/web/src/server/open-house-draft.ts`
- `apps/web/src/server/local-campaign-store.ts` (reduce to explicit local adapter or remove from authenticated path)
- `apps/web/src/app/(authenticated)/marketing/campaigns/new/page.tsx`
- `apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx`
- `apps/web/src/app/(authenticated)/overview/page.tsx`
- campaign feature components and integration/browser tests

## Test plan

- Integration: create then read/list from real database adapter.
- Integration: tenant A cannot see tenant B campaign in list or detail.
- Browser: create -> preflight -> persisted detail -> refresh -> still present.
- Browser: authorized approver sees action; creator/viewer does not.
- Browser: production-capable environment never falls back to synthetic/local store when DB/session configuration is absent; it fails closed.

## Risks

- Mixing safe UI projections with raw immutable manifests can accidentally expose internal/provider identifiers.
- A hidden fallback to synthetic fixtures could make staging appear healthy while real persistence is broken; non-local modes must fail closed.

