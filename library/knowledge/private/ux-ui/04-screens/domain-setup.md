# Domain setup

## Governing sections

Design Brief sections 9, 10, 11, 14, 15, 16 and 18 govern this Settings screen. In particular: "The interface must never promise provider behavior that has not been verified." The existing `@oalo/ui` Button, TextField, Card, Badge, Link and Dialog wrappers govern controls, semantic states and consequential confirmations. The October 1 light-look amendments take precedence over historical navy surfaces.

## Composition and tokens

One page heading, introductory subdomain guidance and a single bordered Card for the active task. The saved hostname heads a separate status section. The three ordered checks are domain control, recommended DNS records and HTTPS. Records wrap rather than causing horizontal overflow at 390px. Use existing text steps, `--space-3` through `--space-6`, semantic text/border/sunken tokens, and the wrappers' shallow card treatment. No new tokens, fonts, motion or libraries.

## Interaction contract

Settings links to Domains. Read the strict current-owner API before any write. New connections recommend a subdomain; the customer explicitly identifies an apex domain if applicable. A confirmation names the exact host and the eventual provider attachment. Connecting purchases nothing and changes no DNS itself. Reconnecting retains the saved default kind. The compatibility default for a new claim is Live webinar; no customer root-address selection or root-live promise is exposed until its consumer exists.

October15 source increment: the root consumer is now implemented in the completion branch. The connection form adds the existing Select wrapper labeled "Funnel at this address" with exactly Live webinar, On-demand webinar, Buyer, Refinance and Lead magnet. A new connection initially selects Live webinar; reconnect initially selects the saved kind. An explicit choice changes the pending connect payload only. The confirmation names the exact host and chosen funnel; Cancel retains both draft fields without writing. The saved card names the server-recorded default, with no connected-default editor in this increment. Disable the chooser with the same read/write readiness guards as the hostname. Explain that verification and an eligible publication are still required; selecting a kind neither publishes a funnel nor proves routing is live. This source change requires later hosted domain/root migrations and qualification before use.

Show server-issued ownership TXT records and the provider's actual DNS recommendations. Copy each name/value independently, report clipboard failures with manual-copy guidance, and never display provider configuration secrets or raw errors. Distinguish ownership, hosting, routing and HTTPS states. Missing or stale proof never produces a success badge. A countdown controls check eligibility, with server enforcement authoritative. DNS propagation has no promised duration.

Read-only and unavailable states explain the next action. Disconnect remains available for an editable saved record even when the provider is disabled and requires deliberate confirmation. Pending operations block duplicates. A revision conflict or an unconfirmed write requires loading the latest saved state before another write, preserving typed input. Refresh is an actual GET, not a page reload.

The shared [AsyncState contract](../03-components/async-empty-error-permission-state.md) owns generic loading, error, permission-restricted and unavailable composition. Render these as `loading`, `error`, `permission_restricted` and `degraded`, respectively, with `surface="card"` directly on the page. Preserve the domain settings label and sanitized failure, plus the current session restriction and saved-record/disconnect explanation. The permission wrapper's required fields describe the loan officer's editable session and account support; they introduce no customer roles or role choices. Field errors remain attached to TextField and concise successful notices remain polite live feedback. These wrappers do not change confirmation, focus, write eligibility or current-proof checks.

## Accessibility and output truth

One enabled primary action per task, named 44px targets, labeled fields, visible wrapper focus rings, polite status and alert errors. Dialog traps focus, supports Escape and restores focus. Forms become one column; there are no sticky actions. Ready means a current server check, not that a publication exists. This packet links to the existing published-funnel workspace only; it creates no unverified custom-host or root link.

## Proof plan

Interaction tests cover strict parsing, all saved states, disabled/read-only capability, concurrency, stale revision, cooldown, uncertainty, reload, clipboard and confirmation focus. Shared-state composition checks cover blocked loading, sanitized error, session restriction and unavailable setup. Browser frames intended for independent inspection: empty, ownership, provider-DNS, certificate, ready, stale, disabled-provider saved record, read-only, disconnect dialog, blocked loading and failed read at 1440, 1180, 768 and 390 in Light and Dark. Synthetic API response frames must be labeled; they do not prove provider DNS/TLS, database persistence or an owned-host visitor journey. No existing canonical PNG changes are authorized here.
