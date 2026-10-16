# Customer-domain root Quality self-review

Performed after the domain-root Security self-review, against its unchanged source pins. Author self-review, not independent review. Plan: [domain-root increment](2026-10-14-domain-root-plan.md).

| Requirement | Evidence | Result |
| --- | --- | --- |
| Use the kind selected during domain connection | Native test publishes buyer and refinance for the same owner; root stays on the chosen buyer kind | PASS |
| Exact current domain owner only | Native foreign-owner separation, disconnect and reassignment checks; no tenant/actor argument accepted by public selector | PASS |
| Latest publication, no old fallback after withdrawal | Native second buyer publication becomes the default; revoking it refuses root even while the older direct link remains public | PASS |
| Expiry and current proof still gate public serving | Existing native stale-ownership checks retained; root returns no destination after publication expiry or disconnect | PASS |
| No private-root fallback and no open redirect | Server-page tests cover session-bearing custom host, missing/failed lookup, platform overview and local demo; UUID-only capability decoder rejects hostile/extra fields | PASS |
| No-cache, finite methods and preserved private path refusals | Proxy and routing tests admit GET/HEAD root, refuse POST and existing private paths, and assert privacy headers | PASS |
| Source closeout and no unsupported qualification claim | Security precedes this review; current-head canonical CI and actual configured owned-host proof remain separate | LOCAL PASS, RELEASE OPEN |

Verification:109 focused unit cases across9 files;3 server-page integration cases;29 domain/homeowner PostgreSQL route cases across3 files under a restricted login, plus5 budget-native cases;158 contracts across15 files; all16 package typechecks and production builds. Lint, formatting, architecture, product-type, secrets, whitespace and zero-clone gates pass. The initial server-page test was placed in the unit project, which does not transform TSX, then moved to the existing integration project without changing runner configuration or assertions.

The read-only hosted-runtime report confirms production still serves ccc705e and inventories environment names without decrypting values. The earlier database snapshot was26 source versions versus17 hosted; this additive root migration brings current source to27. No migration/deployment was performed. No provider, capture or paid action was invented. Canonical visual baselines remain unchanged because the customer root redirects to an existing public surface.

Technical-writing review: the plan and inventory reports use reference/explanation modes, lead with their confirmed scope, name the observed commit/project, distinguish historical from current state, and retain unverified limits. Mode, opening, evidence examples, voice, reader prerequisites and completeness pass at this increment's scope.

Whole-product completion remains open in the completion ledger. The existing connection form starts with Live webinar, or preserves the previous disconnected record's kind; it has no kind chooser yet. The new root consumes the stored kind. This increment does not add that chooser, automatic domain rechecks, change a connected domain's kind, establish public conversion proof, bind missing publisher services or activate RentCast/HighLevel/Meta.
