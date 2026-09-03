import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const prdRoot = join(
  repositoryRoot,
  "library",
  "requirements",
  "in-work",
  "prd-001-operation-automated-lo",
);

const prds = [
  {
    key: "001j",
    file: "prd-001j-operation-automated-lo-platform-foundation-runtime-and-delivery.md",
    dependencies: "Phase 0 scaffold",
  },
  {
    key: "001a",
    file: "prd-001a-tenant-installation-and-ghl-oauth.md",
    dependencies: "001j",
  },
  {
    key: "001b",
    file: "prd-001b-brand-partner-and-compliance-profile.md",
    dependencies: "001j, 001a tenant contract",
  },
  {
    key: "001c",
    file: "prd-001c-campaign-blueprint-and-preflight.md",
    dependencies: "001j, 001a tenant contract, 001b",
  },
  {
    key: "001d",
    file: "prd-001d-page-pdf-and-creative-rendering.md",
    dependencies: "001j rendering foundation, 001c",
  },
  {
    key: "001e",
    file: "prd-001e-meta-ad-launch.md",
    dependencies: "001c, 001d, G3, G4",
  },
  {
    key: "001f",
    file: "prd-001f-ghl-lead-routing-and-attribution.md",
    dependencies: "001a tenant contract, 001c, 001d, G5",
  },
  {
    key: "001h",
    file: "prd-001h-self-onboarding-and-launch-readiness.md",
    dependencies: "001a, 001b, 001e, 001f, UI Raid",
  },
  {
    key: "001g",
    file: "prd-001g-campaign-and-portfolio-reporting.md",
    dependencies: "001e, 001f, UI Raid",
  },
  {
    key: "001i",
    file: "prd-001i-ai-assisted-brand-and-campaign-generation.md",
    dependencies: "001a tenant contract, 001b, 001c",
  },
];

const ownerByPrd = {
  "001a": "auth-guardian / gohighlevel-guardian",
  "001b": "typescript-node-guardian / db-guardian",
  "001c": "typescript-node-guardian",
  "001d": "typescript-node-guardian",
  "001e": "gohighlevel-guardian / durable-workflows-guardian",
  "001f": "gohighlevel-guardian / durable-workflows-guardian",
  "001g": "typescript-node-guardian / react-guardian",
  "001h": "auth-guardian / react-guardian",
  "001i": "mind-guardian",
};

const modelByOwner = {
  "auth-guardian / gohighlevel-guardian": "gpt-5.6-sol, high",
  "typescript-node-guardian / db-guardian": "gpt-5.6-sol, high",
  "typescript-node-guardian": "gpt-5.6-sol, high",
  "gohighlevel-guardian / durable-workflows-guardian": "gpt-5.6-sol, high",
  "typescript-node-guardian / react-guardian": "gpt-5.6-sol, high",
  "auth-guardian / react-guardian": "gpt-5.6-sol, high",
  "mind-guardian": "gpt-5.6-sol, high",
};

const verifiedFoundation = new Map([
  [
    "A new developer can install, start local database, run web, run tasks, and execute the complete verification suite from documented commands.",
    "P0-022",
  ],
  [
    "Node, pnpm, Next.js, TypeScript, Trigger.dev, Playwright, and database tooling versions are pinned.",
    "P0-002, P0-003, P0-012, P0-013",
  ],
  [
    "`apps/web` and `apps/tasks` build from the same tested packages without copied business logic.",
    "P0-004, P0-005",
  ],
  ["Import-boundary checks fail a deliberate reverse dependency.", "P0-006"],
]);

const uiPatterns = [
  /dashboard/i,
  /theme/i,
  /keyboard/i,
  /screen-reader/i,
  /focus/i,
  /contrast/i,
  /checklist items open/i,
  /visible checklist/i,
  /dismiss optional guidance/i,
  /setup works in the embedded/i,
  /leaving, reloading, changing theme/i,
];

const deferredAuthPatterns = [
  /embedded access works/i,
  /first-party fallback works/i,
  /oauth state, signed context/i,
  /custom page requests signed context/i,
  /encrypted context is sent/i,
  /embedded application token/i,
  /partitioned embedded cookies/i,
  /direct first-party access/i,
  /authorization uses random/i,
  /callback url/i,
  /authorization codes/i,
  /returned identity is matched/i,
  /granted scopes and token metadata/i,
  /tokens are envelope-encrypted/i,
  /token fields and secrets/i,
  /refresh begins/i,
  /location-scoped lock prevents parallel refresh/i,
  /new access and refresh tokens/i,
  /confirmed authentication failure/i,
  /failed refresh/i,
  /agency install can enumerate/i,
  /future-location install events/i,
  /direct location install and bulk install/i,
  /agency-installed location can complete local setup/i,
  /shared secret and decrypted context/i,
  /install, uninstall, and app-update webhooks/i,
  /cookie CSRF, null origin/i,
  /signed HighLevel context/i,
  /uninstall revokes application sessions/i,
  /authorized user can send a clearly labeled test lead/i,
  /setup works in the embedded HighLevel Custom Page/i,
  /installer authority from signed context/i,
  /missing required core permission/i,
  /read-only ad access/i,
];

const uiOwnedEvidence = new Map([]);

const doneEvidence = new Map([
  ["001J-AC-006", "pgTAP runtime-role audit proves NOLOGIN, NOINHERIT, and NOBYPASSRLS"],
  ["001J-AC-007", "tenant-isolation pgTAP exercises runtime access across product tables"],
  ["001J-AC-008", "transaction-context and pgTAP tests prove missing tenant context fails closed"],
  ["001J-AC-009", "context-reset pgTAP proves commit and rollback clear transaction-local context"],
  ["001J-AC-010", "support-access pgTAP requires a matching grant and writes an audit event"],
  [
    "001J-AC-011",
    "durable-foundation unit: transaction rollback leaves no state, audit, or outbox work",
  ],
  ["001J-AC-012", "durable-foundation unit: failed dispatch is released and swept again"],
  [
    "001J-AC-013",
    "durable-foundation unit: duplicate command, event, task, and webhook references converge",
  ],
  ["001J-AC-014", "durable-foundation unit: tenant provider, renderer, and AI queue limits"],
  ["001J-AC-015", "durable-foundation unit: uncertain write reconciles before any possible retry"],
  [
    "001J-AC-016",
    "durable-foundation unit: authority is checked before reserve and immediately before write",
  ],
  [
    "001J-AC-017",
    "rendering-storage unit: identical immutable manifest and version inputs produce identical artifacts",
  ],
  [
    "001J-AC-018",
    "rendering-storage contract and unit: artifact record contains complete lineage and immutable storage metadata",
  ],
  [
    "001J-AC-027",
    "tenant-installation unit rejects algorithm, issuer, audience, key, role, revocation, and tenant mismatches",
  ],
  ["001J-AC-030", "environment contract and unit reject production identities in preview"],
  [
    "001J-AC-019",
    "production object-store adapter accepts only exact tenant-private transfers with no public exposure",
  ],
  [
    "001J-AC-020",
    "approved checksum-bound public copies and exact withdrawal with immutable audit evidence are tested",
  ],
  [
    "001J-AC-021",
    "production image normalization and the malicious-input corpus reject every enumerated vector",
  ],
  [
    "001J-AC-031",
    "expand and contract fixtures test candidate web and task compatibility against both prior runtimes",
  ],
  [
    "001J-AC-034",
    "closed operational alerts require a correlation ID and the exact documented response link",
  ],
  ["001A-AC-001", "tenant contract requires a non-null product location identifier"],
  ["001A-AC-002", "tenant unit derives location only from validated session context"],
  ["001A-AC-003", "tenant unit rejects body and query location overrides"],
  ["001A-AC-004", "RLS pgTAP and tenant repository units reject cross-location access"],
  ["001A-AC-017", "token diagnostic and redaction units remove plaintext from safe output"],
  ["001A-AC-024", "installation lifecycle unit converges future-location updates idempotently"],
  ["001A-AC-025", "direct and bulk fixture installation share one convergent tenant contract"],
  ["001A-AC-030", "fixture provider response classifier reads rate-limit headers"],
  ["001A-AC-031", "fixture provider decision enforces one in-flight request per location"],
  ["001A-AC-033", "fixture write ledger requires and converges on an idempotency record"],
  ["001A-AC-035", "capability evaluation stores granted-scope results with the installation"],
  ["001A-AC-037", "capability evaluation requires Profile C and rejects read-only ad access"],
  ["001B-AC-001", "strict profile schemas validate every application boundary"],
  ["001B-AC-002", "profile repository appends versions instead of overwriting history"],
  ["001B-AC-003", "current-profile pointer enforces one version per location and type"],
  ["001B-AC-004", "preview and rollback units preserve history and append rollback versions"],
  ["001B-AC-005", "immutable snapshots preserve versions referenced by prior campaigns"],
  [
    "001B-AC-006",
    "asset unit type-checks, bounds, decodes, re-encodes, strips metadata, and stores privately",
  ],
  ["001B-AC-009", "provider mapping schema stores provider ID and safe display metadata"],
  ["001B-AC-010", "readiness evaluation blocks stale or missing provider mappings"],
  ["001B-AC-011", "attestation schema records authorized and current-value claims"],
  ["001B-AC-012", "profile contract separates user attestation from legal approval"],
  [
    "001B-AC-015",
    "readiness derives requirements from blueprint, channel, lender policy, state, and location context",
  ],
  ["001B-AC-016", "readiness revalidates provider mappings and uploaded assets"],
  ["001B-AC-017", "suggestions are field-limited and require explicit user confirmation"],
  ["001B-AC-018", "field policy prevents sensitive compliance values from model approval"],
  ["001B-AC-019", "sample quarantine rejects identity, financial, and private CRM data"],
  [
    "001B-AC-020",
    "compiler emits prompt snapshot and deterministic rules from one confirmed version and hash",
  ],
  ["001C-AC-001", "campaign version schema and repository keep inputs immutable"],
  ["001C-AC-002", "campaign version records every required source version identifier"],
  ["001C-AC-003", "canonical manifest unit proves material changes alter the hash"],
  ["001C-AC-004", "material edits create new versions with version-bound approval"],
  ["001C-AC-005", "append-only repository retains prior versions and decisions"],
  ["001C-AC-007", "duplication creates a sourced draft after dependency revalidation"],
  ["001C-AC-008", "preflight unit proves deterministic, side-effect-free execution"],
  ["001C-AC-009", "finding schema requires code, description, target, and remediation"],
  ["001C-AC-010", "preflight preserves non-blocking warnings in approval data"],
  ["001C-AC-011", "preflight test covers every enumerated deterministic rule family"],
  ["001C-AC-012", "financing terms require an explicitly approved tenant rule"],
  ["001C-AC-013", "preflight blocks disallowed audiences, targeting, and providers"],
  ["001C-AC-014", "preflight records all input versions and the ruleset version"],
  ["001C-AC-015", "preflight rejects model waivers and remains authoritative"],
  ["001C-AC-016", "approval service requires the authority port to accept the actor"],
  ["001C-AC-018", "approval records actor, role, time, audit data, version, and decision"],
  ["001C-AC-019", "approval policy derives required Realtor and lender approvals"],
  ["001C-AC-020", "approval links are short-lived, purpose-bound, tenant-bound, and single-use"],
  ["001C-AC-021", "publish authorization rechecks approval and dependency freshness"],
  ["001C-AC-023", "campaign state machine rejects invalid transitions"],
  ["001C-AC-024", "campaign lifecycle events append idempotently"],
  ["001C-AC-025", "operation retry preserves the existing campaign version"],
  ["001C-AC-026", "generation records prompt, policies, request, usage, and output hash"],
  ["001C-AC-027", "usable regeneration creates one version and consumes allowance once"],
  [
    "001I-AC-002",
    "AI suggestions remain needs_confirmation and profile promotion requires confirmation",
  ],
  ["001I-AC-003", "extraction schema excludes factual and compliance-sensitive approved fields"],
  ["001I-AC-004", "generation records every frozen input, prompt, and model-policy version"],
  [
    "001I-AC-005",
    "stable prompt prefix precedes variable data and usage records cache token categories",
  ],
  ["001I-AC-006", "AI unit proves tenant-scoped cache keys and distinct prompt context hashes"],
  ["001I-AC-008", "accepted generation runs deterministic preflight before approval availability"],
  [
    "001I-AC-009",
    "failure matrix proves bounded repair, failover, reconciliation, audit, and idempotency",
  ],
  [
    "001I-AC-010",
    "allowance view exposes plan units and provider-cost reconciliation is deterministic",
  ],
  ["001I-AC-011", "per-location guard bounds concurrency, request volume, and forecast spend"],
  [
    "001D-AC-001",
    "RenderManifestSchema is strict and renderArtifactBatch validates it before port invocation",
  ],
  [
    "001D-AC-002",
    "ArtifactRecordSchema and rendering-storage lineage unit cover all enumerated metadata",
  ],
  ["001D-AC-003", "rendering-storage unit proves stable logical output and content hashes"],
  ["001D-AC-004", "rendering-storage unit proves changed input creates new immutable identities"],
  [
    "001D-AC-005",
    "render source plan uses exact campaign version, snapshot, and approved asset references",
  ],
  [
    "001D-AC-006",
    "golden fixture and visual fingerprints cover the required approved output variants",
  ],
  ["001D-AC-007", "source plans are deterministic and block unapproved or missing dependencies"],
  [
    "001D-AC-008",
    "PublishedCampaignProjectionSchema is a strict public-data allowlist; private-field test rejects",
  ],
  [
    "001D-AC-009",
    "public source uses an opaque tracking path and excludes tenant-private identifiers",
  ],
  [
    "001D-AC-010",
    "public source emits a restrictive content security policy and safe link attributes",
  ],
  [
    "001D-AC-011",
    "campaign source tests cover semantic structure and accessible text alternatives",
  ],
  ["001D-AC-012", "performance-budget tests bound source, image, and asset payload size"],
  ["001D-AC-015", "public page, PDF, creative, and QR plans share the same frozen source contract"],
  ["001D-AC-018", "PDF source is self-contained and contains no network-capable references"],
  ["001D-AC-020", "Meta creative source enforces configured output dimensions and MIME types"],
  ["001D-AC-022", "creative plan contains deterministic cover-crop and safe-zone behavior"],
  ["001D-AC-027", "private transfer contract requires private visibility and tenant-prefixed keys"],
  [
    "001D-AC-028",
    "publishProjection accepts ready artifacts for the approved version and builds immutable public keys",
  ],
  ["001D-AC-029", "planPrivateTransfer rejects expired or greater-than-ten-minute URLs"],
  ["001D-AC-030", "withdrawal contract records immutable keys, reason, actor, and withdrawal time"],
  ["001D-AC-032", "render source applies CSP, no-network constraints, and explicit budgets"],
  ["001D-AC-033", "visual contract checks heading order, labels, alt text, and readable structure"],
  ["001E-AC-002", "fixture plans scope every discovered asset operation to the active location"],
  [
    "001E-AC-004",
    "asset validation returns stable blocking remediation for unavailable selections",
  ],
  ["001E-AC-007", "target schema exposes only approved geography and placement fields"],
  [
    "001E-AC-008",
    "strict targeting schema rejects protected, ZIP, custom, and lookalike dimensions",
  ],
  ["001E-AC-009", "budget and duration enforce tenant and platform intersections"],
  [
    "001E-AC-011",
    "adapter deterministically compiles the frozen campaign into fixture request plans",
  ],
  ["001E-AC-012", "draft planning reserves command idempotency before provider work"],
  ["001E-AC-013", "provider identifiers persist only after confirmed response or read-back"],
  ["001E-AC-014", "draft read-back is normalized and compared with the approved version"],
  ["001E-AC-015", "read-back mismatches block publish and enumerate changed fields"],
  ["001E-AC-016", "publish gate requires role, preflight, approvals, version, token, and assets"],
  ["001E-AC-019", "uncertain write state requires reconciliation before any retry"],
  ["001E-AC-020", "safe audit schema records attempt context without secrets or PII"],
  ["001E-AC-021", "pause and resume require explicit confirmation"],
  ["001E-AC-022", "material Meta changes require a new campaign version and approval"],
  ["001E-AC-023", "Meta adapter exports no deletion operation"],
  ["001E-AC-024", "Meta adapter exports no automatic budget or targeting optimization"],
  ["001E-AC-025", "reporting normalizes every required metric, state, and health signal"],
  ["001E-AC-026", "reporting includes provider freshness and last successful sync"],
  ["001E-AC-027", "missing provider metrics remain null and are never fabricated as zero"],
  ["001E-AC-028", "allowlist has no delete route"],
  ["001E-AC-029", "allowlist has no custom-audience member operation"],
  ["001E-AC-030", "allowlist has no integration or ad-account disconnect operation"],
  ["001E-AC-031", "allowlist has no forbidden provider or commercial operation"],
  ["001E-AC-032", "tests lock exact route templates and HTTP methods"],
  [
    "001F-AC-001",
    "public intake resolves only a literal active, approved, published campaign authority",
  ],
  [
    "001F-AC-002",
    "strict lead schema enforces field types, lengths, formats, and destination requirements",
  ],
  ["001F-AC-003", "abuse port receives tenant and hashed IP-derived rate-limit keys only"],
  ["001F-AC-004", "acceptance issues the idempotency key on the server"],
  [
    "001F-AC-005",
    "consent schema requires visible disclosure, false initial state, and user action",
  ],
  [
    "001F-AC-006",
    "private consent receipt records campaign versions, disclosure, channels, destinations, time, and safe metadata",
  ],
  [
    "001F-AC-007",
    "public accepted response and command contain no lead PII, URL, or analytics payload",
  ],
  [
    "001F-AC-008",
    "routing location is copied from campaign authority and absent from the private lead payload",
  ],
  [
    "001F-AC-009",
    "email and phone normalization plus exact collision strategy are documented in code and tested",
  ],
  [
    "001F-AC-010",
    "reconciliation and step idempotency prevent duplicate contact and opportunity writes",
  ],
  ["001F-AC-011", "routing applies one namespaced tag and campaign attribution key"],
  ["001F-AC-012", "routing creates or updates one configured pipeline and stage opportunity"],
  ["001F-AC-013", "routing applies the configured owner idempotently"],
  ["001F-AC-014", "workflow enrollment requires configured workflow, consent, and tenant policy"],
  ["001F-AC-015", "routing reads provider DND and consent state before workflow enrollment"],
  [
    "001F-AC-016",
    "public success is returned only after the transactional acceptance port confirms durable work",
  ],
  [
    "001F-AC-017",
    "provider failures enter the exception queue and schedule bounded idempotent durable retries",
  ],
  ["001F-AC-018", "routing reconciles stored and provider partial progress before any new write"],
  [
    "001F-AC-019",
    "exception queue stores the server command and encrypted payload reference for replay",
  ],
  [
    "001F-AC-020",
    "successful routing schedules encrypted raw-payload deletion after the audit window",
  ],
  [
    "001F-AC-021",
    "routing result retains provider IDs and campaign linkage without copying the CRM record",
  ],
  ["001F-AC-022", "normalized attribution milestones append through an append-only event port"],
  ["001F-AC-023", "raw-body verifier and source-event deduplication gate attribution webhooks"],
  [
    "001F-AC-024",
    "periodic reconciliation appends missed normalized events without overwriting history",
  ],
  [
    "001F-AC-025",
    "attribution schema distinguishes observed, inferred, and manually confirmed provenance",
  ],
  [
    "001F-AC-027",
    "synthetic verification requires contact, tag, opportunity, owner, workflow, and notification proof",
  ],
  ["001F-AC-028", "synthetic verification requires explicit production-metric exclusion"],
  ["001F-AC-029", "launch gate requires a passed lead path or actor-and-reason exception"],
  [
    "001A-AC-036",
    "permission readiness returns the missing capabilities and exact reconnect action",
  ],
  [
    "001A-AC-032",
    "retry planner applies bounded exponential backoff, deterministic jitter, and Retry-After precedence",
  ],
  [
    "001A-AC-039",
    "agency bulk activation records installation only; attestations and customer roles remain separate",
  ],
  [
    "001A-AC-027",
    "installation lifecycle delivery wrapper acknowledges duplicate webhook references without reprocessing",
  ],
  ["001A-AC-029", "uninstall schedules deletion once from the validated tenant retention policy"],
  [
    "001A-AC-040",
    "installation and onboarding role-binding ledgers converge repeated operations without duplicates",
  ],
  [
    "001A-AC-034",
    "permission screen groups required, granted, missing, and optional capabilities by business purpose",
  ],
  ["001G-AC-001", "normalized campaign record includes every required campaign and funnel field"],
  ["001G-AC-002", "campaign history filter covers Realtor, property, status, and all three dates"],
  [
    "001G-AC-003",
    "campaign record joins artifacts, approval, Meta identity, leads, and GHL outcomes",
  ],
  [
    "001G-AC-004",
    "tested campaign surface previews immutable versions, opens the approved link, and stages a new draft without changing history",
  ],
  ["001G-AC-005", "every reporting metric carries source and last-updated time"],
  ["001G-AC-006", "unavailable metrics remain null and are never coerced to zero"],
  ["001G-AC-007", "campaign metric builder excludes labeled test leads before CPL calculation"],
  ["001G-AC-008", "target access requires provider permission plus tenant and location authority"],
  ["001G-AC-009", "stable exception taxonomy covers every required health condition"],
  [
    "001G-AC-010",
    "strict exception record includes safe explanation, attempt, correlation, and action",
  ],
  ["001G-AC-011", "support notification projection omits tenant narrative, secrets, and lead data"],
  ["001G-AC-012", "blueprint aggregation accepts only normalized non-PII dimensions"],
  ["001G-AC-013", "aggregator groups all six dimensions and enforces a sample floor"],
  ["001G-AC-014", "aggregate output omits tenant and campaign identities"],
  ["001G-AC-015", "cross-tenant output requires both minimum samples and at least two tenants"],
  ["001G-AC-016", "read-only aggregation returns metrics without any campaign mutation command"],
  ["001G-AC-017", "cohort event contract covers purchase through continuation and support time"],
  ["001G-AC-018", "cohort summary covers verification events, blockers, and readiness duration"],
  ["001G-AC-019", "cohort counts expose the product-gate milestones defined by PRD-001"],
  [
    "001G-AC-020",
    "tested three-field support-time entry pairs a consistent interaction with the safe cohort minutes contract",
  ],
  [
    "001G-AC-021",
    "agency portfolio fails closed unless every requested location is explicitly authorized",
  ],
  ["001G-AC-022", "agency portfolio excludes locations without an active app installation"],
  [
    "001G-AC-023",
    "portfolio totals expose exception and campaign-detail links only for explicitly authorized locations",
  ],
  ["001G-AC-024", "Realtor projection requires both assignment and matching Realtor identity"],
  [
    "001G-AC-025",
    "Realtor projection exposes only status, approval, artifacts, and allowed aggregates",
  ],
  [
    "001G-AC-026",
    "strict Realtor projection omits CRM, borrower, credential, support, and benchmark data",
  ],
  ["001G-AC-027", "strict audit contract covers invitation through revocation lifecycle events"],
  [
    "001G-AC-028",
    "aggregate counts require tenant opt-in, assignment opt-in, and a minimum-data rule",
  ],
  [
    "001G-AC-029",
    "UI Foundation browser tests prove keyboard-accessible Light, Dark, and System selection",
  ],
  [
    "001G-AC-030",
    "UI Foundation resolves the browser or operating-system preference on first visit",
  ],
  [
    "001G-AC-031",
    "manual Light or Dark selection persists under a product-specific preference key",
  ],
  ["001G-AC-032", "System clears the manual override and follows live preference changes"],
  [
    "001G-AC-033",
    "theme switching is immediate and preserves navigation, requests, and application evidence",
  ],
  ["001G-AC-034", "first-paint browser evidence proves no wrong-theme flash"],
  ["001G-AC-035", "server rendering and hydration complete without theme mismatch warnings"],
  ["001G-AC-036", "the resolved theme projects the matching browser color-scheme"],
  [
    "001G-AC-038",
    "semantic scans prove delivered components do not consume primitive palettes or raw colors",
  ],
  [
    "001G-AC-039",
    "tenant accents accept only complete contrast-safe semantic overrides for both themes",
  ],
  ["001G-AC-040", "axe and contrast tests pass for every delivered Light and Dark route and state"],
  ["001G-AC-041", "delivered statuses pair color with text and a distinct icon or glyph"],
  [
    "001G-AC-042",
    "theme preference contains no PII and cannot be selected through tenant or user parameters",
  ],
  [
    "001G-AC-043",
    "browser invariance tests prove theme changes cannot alter artifacts, approvals, or campaign evidence",
  ],
  [
    "001G-AC-037",
    "semantic-token tests cover every delivered surface and state, including the approval table, confirmation alertdialog, and drawer modal",
  ],
  [
    "001C-AC-006",
    "campaign manifest links page, PDF, QR, creative, email, SMS, approval, routing, and attribution identities",
  ],
  [
    "001C-AC-022",
    "approval creation rejects model and service principals before consulting approval authority",
  ],
  [
    "001D-AC-013",
    "strict consent disclosure version is rendered visibly before submission and linked for assistive technology",
  ],
  [
    "001D-AC-016",
    "registered Trigger task validates production input and invokes the injected server renderer through database-backed idempotency",
  ],
  [
    "001D-AC-021",
    "validated focal points and square/story safe zones produce deterministic crop and padding geometry",
  ],
  [
    "001D-AC-024",
    "pinned Sharp adapter decodes bounded JPEG and PNG input through the production processor",
  ],
  [
    "001D-AC-025",
    "production normalization strips EXIF, ICC, IPTC, XMP, and TIFF Photoshop metadata",
  ],
  [
    "001D-AC-026",
    "production normalization auto-orients, validates decoded MIME, and re-encodes bounded output",
  ],
  [
    "001B-AC-007",
    "HTTPS fetch plans resolve once, reject mixed private or invalid DNS answers, pin public addresses, and forbid redirects",
  ],
  [
    "001B-AC-008",
    "tested brand setup lists the exact missing Open House Boost fields, reasons, and safe next actions",
  ],
  [
    "001B-AC-014",
    "one frozen canonical brand profile supplies reusable values instead of per-tool re-entry",
  ],
  [
    "001B-AC-013",
    "server-owned compare-and-set progress saves every verified section and resumes on reload or a second device",
  ],
  [
    "001A-AC-041",
    "the same server-owned checklist resumes after reconnect, reinstall, scope upgrade, and token recovery events",
  ],
  [
    "001H-AC-004",
    "location-scoped server progress survives reload, device, principal, theme, and supported recovery changes",
  ],
  [
    "001C-AC-017",
    "approval table displays exact page, PDF, creative, copy, disclosure, targeting, budget, date, form, and destination versions",
  ],
  [
    "001D-AC-014",
    "maintained QR encoder and resolver bind the scannable SVG and short link to one approved campaign version",
  ],
  [
    "001D-AC-017",
    "Chromium emits a tagged, language-bearing print-ready PDF and binary inspection verifies its pages",
  ],
  [
    "001D-AC-019",
    "real generated PDF bytes pass denied-network and no-remote-runtime binary inspection",
  ],
  [
    "001D-AC-023",
    "tested creative workspace previews both approved formats and downloads their immutable originals",
  ],
  [
    "001D-AC-031",
    "real Chromium rasters cover every public-page width and repeatable PDF rendering",
  ],
  [
    "001E-AC-010",
    "launch review lists every target, exclusion, budget value, cadence, date, and timezone",
  ],
  [
    "001E-AC-017",
    "safe final-confirmation action is explicit and proves that no provider write occurred",
  ],
  [
    "001E-AC-001",
    "strict injected transport binds the active location to the exact Meta integration GET route and connection response",
  ],
  [
    "001E-AC-003",
    "exact allowlisted Meta asset GET routes return strictly parsed provider IDs and safe display names for the active location",
  ],
  [
    "001E-AC-018",
    "registered durable task binds the exact publishing-progress GET route, polls within a bounded budget, and converges duplicates",
  ],
  ["001H-AC-007", "permission readiness blocks missing core access and requires reconnect"],
  ["001H-AC-008", "permission readiness rejects read-only advertising access"],
  ["001H-AC-009", "role assignment forbids self-elevation and requires separate authority"],
  ["001H-AC-010", "policy-driven readiness derives requirements from enabled features"],
  [
    "001H-AC-011",
    "every selected GHL and Meta object is read back and matched to the active location before completion",
  ],
  [
    "001H-AC-012",
    "safe namespaced objects are reused first and only allowlisted tag or custom-field creation is idempotent",
  ],
  [
    "001H-AC-013",
    "provider allowlists omit workflow creation, DND changes, imports, and direct Meta credentials",
  ],
  ["001H-AC-014", "synthetic verification requires labeling and production-metric exclusion"],
  ["001H-AC-015", "complete synthetic evidence produces a passed readiness result"],
  ["001H-AC-016", "partial or uncertain synthetic evidence produces reconciliation work"],
  ["001H-AC-017", "launch readiness stores current observed evidence and immutable history"],
  [
    "001H-AC-018",
    "launch-sensitive provider commands fail closed unless observed readiness is launch ready",
  ],
  ["001H-AC-019", "operator checklist is capped at the five highest-priority actions"],
  [
    "001H-AC-020",
    "every delivered onboarding item opens its exact completion surface or evidence link",
  ],
  ["001H-AC-021", "readiness consumes observed server evidence instead of browser flags"],
  [
    "001H-AC-006",
    "tested permission screen shows required, granted, missing, and optional capabilities by business purpose",
  ],
  [
    "001H-AC-022",
    "optional guidance can be dismissed while both server-owned checklist phases remain present",
  ],
  [
    "001H-AC-023",
    "onboarding keyboard, screen-reader, focus, contrast, loading, empty, error, and retry tests pass in both themes",
  ],
  ["001H-AC-024", "onboarding events use a strict safe schema without payload PII"],
  [
    "001J-AC-005",
    "canonical typecheck, product-type, boundary, and Security Guardian reviews prove strict validated local boundaries without explicit any or unhandled production inputs",
  ],
  [
    "001J-AC-025",
    "secret scanning, strict safe schemas, and Security Guardian review prove tokens and secrets are absent from database, task, URL, trace, analytics, and support surfaces",
  ],
  [
    "001I-AC-012",
    "Security Guardian review confirms logs, traces, analytics, and support schemas omit secrets, raw borrower data, and full prompts or samples",
  ],
  [
    "001J-AC-032",
    "canonical pnpm verify, production builds, Security Guardian, and Quality Guardian all pass for the frozen release snapshot",
  ],
]);

const inProgressEvidence = new Map([
  [
    "001I-AC-001",
    "approved samples, suggestion-only fields, and explicit local acceptance are green; configured primary and fallback execution remains",
  ],
  [
    "001I-AC-007",
    "promotion gate requires one complete corpus; real configured primary and fallback execution remains",
  ],
]);

const externalPatterns = [
  /highlevel app test/i,
  /lender compliance approves/i,
  /counsel and lender compliance approve/i,
  /measured founding-cohort/i,
  /founding-cohort setup exercise/i,
  /production smoke/i,
  /database restore/i,
  /kms rotation and recovery/i,
  /preview, staging, and production have isolated/i,
  /production security review approves/i,
  /reach Launch Ready within 30 minutes/i,
];

function extractAcceptanceCriteria(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const start = lines.findIndex((line) => /^## Acceptance criteria\s*$/iu.test(line));
  if (start < 0) {
    throw new Error("Acceptance criteria section not found");
  }

  const criteria = [];
  let section = "Acceptance criteria";
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^## (?!#)/u.test(line)) break;
    const sectionMatch = /^###\s+(.+)$/u.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }
    const criterionMatch = /^\s*-\s+(?:\[ \]\s+)?(.+)$/u.exec(line);
    if (criterionMatch) {
      criteria.push({ section, criterion: criterionMatch[1].trim() });
    }
  }
  return criteria;
}

function ownerFor(prdKey, section, criterion) {
  if (prdKey === "001j") {
    if (section === "Tenant isolation") return "db-guardian";
    if (section === "Durable work and providers") return "durable-workflows-guardian";
    if (section === "Sessions and tokens") return "auth-guardian";
    if (section === "Delivery and recovery") return "devops-guardian";
    return "typescript-node-guardian";
  }
  if (
    prdKey === "001g" &&
    (section === "Theme switching" || uiPatterns.some((pattern) => pattern.test(criterion)))
  ) {
    return "react-guardian / ux-ui-guardian";
  }
  if (prdKey === "001h" && uiPatterns.some((pattern) => pattern.test(criterion))) {
    return "react-guardian / product-tour-onboarding-ui-guardian";
  }
  return ownerByPrd[prdKey];
}

function statusFor(id, prdKey, section, criterion) {
  const phaseZeroEvidence = prdKey === "001j" ? verifiedFoundation.get(criterion) : undefined;
  if (phaseZeroEvidence) return { status: "VERIFIED", evidence: phaseZeroEvidence };
  const uiEvidence = uiOwnedEvidence.get(id);
  if (uiEvidence) return { status: "IN PROGRESS", evidence: uiEvidence };
  const completedEvidence = doneEvidence.get(id);
  if (completedEvidence) return { status: "DONE", evidence: completedEvidence };
  const activeEvidence = inProgressEvidence.get(id);
  if (activeEvidence) return { status: "IN PROGRESS", evidence: activeEvidence };
  if (
    (prdKey === "001j" || prdKey === "001a" || prdKey === "001h") &&
    deferredAuthPatterns.some((pattern) => pattern.test(criterion))
  ) {
    return {
      status: "DEFERRED: LIVE HIGHLEVEL AUTH",
      evidence: "Product-owner direction on 2026-07-21; keep implementation fail-closed",
    };
  }
  if (
    (prdKey === "001g" || prdKey === "001h") &&
    uiPatterns.some((pattern) => pattern.test(criterion))
  ) {
    return {
      status: "IN PROGRESS",
      evidence: "UI Foundation merged; exact remaining behavior requires fresh verification",
    };
  }
  if (externalPatterns.some((pattern) => pattern.test(criterion))) {
    return { status: "BLOCKED: EXTERNAL EVIDENCE", evidence: "G1 through G7 register" };
  }
  if (prdKey === "001e") {
    return {
      status: "BLOCKED: G3 / G4",
      evidence: "Adapter and fixtures may proceed; live acceptance cannot",
    };
  }
  if (
    prdKey === "001f" &&
    /ghl|provider|workflow|opportunity|contact|synthetic|test lead/i.test(`${section} ${criterion}`)
  ) {
    return {
      status: "BLOCKED: G5",
      evidence: "Local contract work may proceed; live acceptance cannot",
    };
  }
  return { status: "OPEN", evidence: "Fresh verification required" };
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

const sections = [];
let total = 0;
for (const prd of prds) {
  const markdown = await readFile(join(prdRoot, prd.file), "utf8");
  const criteria = extractAcceptanceCriteria(markdown);
  total += criteria.length;
  const rows = criteria.map(({ section, criterion }, index) => {
    const id = `${prd.key.toUpperCase()}-AC-${String(index + 1).padStart(3, "0")}`;
    const owner = ownerFor(prd.key, section, criterion);
    const { status, evidence } = statusFor(id, prd.key, section, criterion);
    const model = modelByOwner[owner] ?? "gpt-5.6-sol, high";
    return `| ${id} | ${escapeCell(section)} | ${escapeCell(criterion)} | ${escapeCell(prd.dependencies)} | \`${owner}\` | ${model} | ${status} | ${escapeCell(evidence)} |`;
  });
  sections.push(
    [
      `## PRD-${prd.key.toUpperCase()} (${criteria.length} criteria)`,
      "",
      `Source: \`${relative(repositoryRoot, join(prdRoot, prd.file)).replaceAll("\\", "/")}\``,
      "",
      "| ID | Section | Exact criterion | Dependencies | Owning Guardian | Model | Status | Verification evidence |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      ...rows,
    ].join("\n"),
  );
}

const output = `# Operation Automated LO Production Execution Ledger

## Raid contract

- Branch: \`codex/oalo-production-core-raid\`
- Integrated baseline: \`00ad29ab3d3d30323e5f5c1614308982ec8eb4ca\`
- Scope: remaining PRD-001j production foundation plus PRD-001a through PRD-001i
- Total exact acceptance criteria: ${total}
- Status flow: \`OPEN\` to \`IN PROGRESS\` to \`DONE\` to independently \`VERIFIED\`
- No partial credit: a criterion remains open or blocked until the exact behavior is proven.
- Live HighLevel authorization is temporarily deferred by product-owner direction. OAuth, signed-context exchange, token refresh, bulk-install token exchange, and live embedded-session criteria remain fail-closed and cannot be reported as complete.
- G3 through G7 are not waived. Adapter, fixture, domain, database, and deterministic work may proceed without live writes, spend, customer data, or production traffic, but external acceptance remains blocked.
- G8 remains \`ACCEPTED CONSTRAINT\`, never \`PASS\`. No 15-paid-founder evidence exists.
- UI Foundation PR #10 is merged and rebased into this branch. Its exact accepted evidence is reconciled below; uncovered criteria remain in progress.

## External gate register

| Gate | Status | Raid treatment |
| --- | --- | --- |
| G1 Distribution | BLOCKED | No Marketplace or post-five-agency claim |
| G2 OAuth and session | DEFERRED FOR NOW | Live HighLevel Auth omitted; seams remain fail-closed |
| G3 Meta publish | BLOCKED | No live provider write or spend |
| G4 Special Ad Category | BLOCKED | No unsupported category assumption |
| G5 Lead routing | BLOCKED | No live customer or test-account mutation |
| G6 Billing lifecycle | BLOCKED | No checkout, charge, entitlement activation, or live webhook claim |
| G7 Legal operating model | BLOCKED | No counsel or lender approval claim |
| G8 Demand | ACCEPTED CONSTRAINT | Commercial validation remains unproven |

## Dependency waves

1. Remaining PRD-001j foundation: database, contracts, domain, durable command/outbox/provider safety, rendering/storage seams, observability, recovery scaffolding.
2. PRD-001a tenant contract without live HighLevel Auth, then PRD-001b and PRD-001c.
3. PRD-001d deterministic assets and PRD-001i AI generation in parallel where file ownership is disjoint.
4. PRD-001e Meta and PRD-001f lead routing as allowlisted fixture-backed adapters, with live acceptance blocked.
5. Rebase and integrate the separate UI Raid, then complete PRD-001h and PRD-001g non-external criteria.
6. Resolve or explicitly retain external blockers with evidence.
7. Security Guardian close-out.
8. Quality Guardian independent verification.
9. Rebase on \`origin/main\`, rerun the exact gate, push, open a PR, and monitor CI.

${sections.join("\n\n")}

## Raid log

| Time | Event |
| --- | --- |
| 2026-07-21 | Fetched current \`origin/main\` at \`ff6b02b\` and created \`codex/oalo-production-core-raid\`. |
| 2026-07-21 | Read PRD-001j and PRD-001a through PRD-001i, the PRD index, research gate, architecture contracts, delivery plan, and threat model. |
| 2026-07-21 | Recorded product-owner direction to proceed without live HighLevel Auth for now. G3 through G7 remain blocked, and G8 remains an accepted constraint. |
| 2026-07-21 | Confirmed the separate UI Foundation Raid owns \`packages/ui/**\` and UI deliverables; this Raid uses a separate production ledger to avoid conflicts. |
| 2026-07-21 | Merged clean UI Foundation PR #10 at \`00ad29a\`, rebased production core without conflict, and reconciled exact UI acceptance evidence. |
`;

const writeCanonical = process.argv.includes("--write-canonical");
const outputPath = writeCanonical
  ? join(repositoryRoot, "PRODUCTION_EXECUTION_LEDGER.md")
  : join(repositoryRoot, "tmp", "generated-production-execution-ledger.md");

if (writeCanonical) {
  console.warn(
    "WARNING: overwriting PRODUCTION_EXECUTION_LEDGER.md. The canonical ledger carries verified statuses that this regenerator does not preserve. Prefer reviewing tmp output first.",
  );
}

await writeFile(outputPath, output, "utf8");
console.log(`Wrote ${total} acceptance criteria to ${relative(repositoryRoot, outputPath)}`);
