# User Language Contract

> Category: Standard | Version: 1.0 | Date: September 2026 | Status: Approved
> Source: [PRD-006b](../../../requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/prd-006b-first-party-sign-in-and-guided-experience-user-language.md) D1 through D4 and D8

Every word a user reads in Operation Automated LO is written for a mortgage loan officer who has never seen this codebase. This document is the rule. It governs product copy, page titles, the site description, accessible names, placeholders, help text, error messages, and the account emails. It does not govern code identifiers, database column names, log lines, test names, or anything else a user never sees.

**Related:**

- [Documentation framework](documentation-framework.md)
- [UX/UI source of truth](../ux-ui/README.md)
- [What Automated LO does today](../../public/overview/what-is-automated-lo.md)
- [Open House Boost FAQ](../../public/faqs/open-house-boost-faq.md)

---

## 1. Who is reading

A loan officer who runs open houses with Realtor partners. They know mortgages, compliance, open houses, and their CRM. They do not know what a session is, what a hash is, what a projection is, or what the product calls things internally. They opened the product to get one open house campaign made and approved.

## 2. Voice and tone

1. **Second person, present tense, active voice.** "You can approve this", not "Approval may be recorded by an authorized approver."
2. **Plain words over precise-sounding words.** "Saved", not "persisted". "Checks", not "preflight". "Your workspace", not "location". "Approver", not "campaign_approver".
3. **Specific over abstract.** Name what the product did, will do, or cannot do yet. "Meta isn't connected yet, so this campaign won't run as an ad", not "Provider publication remains disabled."
4. **Warm, not chatty.** No exclamation marks in status copy. One idea per sentence.
5. **Sentence case** for headings, buttons, and labels. Product names keep their casing: Open House Boost, HighLevel, Meta, Stripe, Automated LO.
6. **The user's formats** for numbers, dates, and money.
7. **Honesty is a tone rule, not an exception to one.** A not-connected state, a locked action, or an error says what is true and what the user can do next, in the same voice as everything else.
8. **No em dash and no en dash** in any string, comment, or document line. Use a comma, a colon, parentheses, a period, or a semicolon.

## 3. Forbidden vocabulary

Never rendered to a user, in any case, tense, or compound, in text nodes, `aria-label`, `title`, `alt`, `placeholder`, `<meta name="description">`, page titles, or emails.

| Group | Terms |
|---|---|
| Deployment and testing | review surface, review mode, demo mode, workspace mode, synthetic, fixture, harness, scaffold, stub, contract (as a software noun), deterministic, projection, server-shaped, evidence, verifier, runtime, composition, handler, payload, route (as a noun for a page), region (as a noun for a page area) |
| People and access | operator, persona, principal, tenant, resolver, authorized resolver, seat, entitlement, capability (as an access noun), grant state |
| Sessions and security | session ref, session id, first-party session, verified session, CSRF, correlation, correlation ID, exception code, idempotent, row version, manifest hash, preflight result hash, canonical, definer |
| Data words | provider (say the name: HighLevel, Meta, Stripe), provider mode, preflight (say "checks" or "campaign check"), persisted, persist, immutable, frozen, freeze, compile, mutation, read-only projection, observation, no live observation |
| Identifiers | any `location_`, `actor_`, `principal_`, `installation_`, `session_`, `campaign_`, `correlation_`, `syn-` or `synthetic-` prefixed reference; any UUID; any 64-hex hash; any `OALO_*` or `NEXT_PUBLIC_*` name; any `SCREAMING_SNAKE` code; any `snake_case` state or role token |

### How the automated guard reads this table

Most terms are banned outright and matched case-insensitively on a word boundary. Five entries carry a qualifier in the table ("as a software noun", "as a noun for a page", "as a noun for a page area", "as an access noun", and the instruction to name the provider). Those are still banned outright in user copy, because none of them has a user-facing sense in this product. The one word with a real user-facing sense is the geographic sense of "region" in ad targeting; the product says "area" there instead, so the ban holds without an exception. Where the guard cannot decide, the contract decides, and the guard is narrowed with a comment naming this section.

## 4. Preferred vocabulary

| Instead of | Say |
|---|---|
| location, tenant, workspace mode | your workspace |
| principal, actor, user id | you, your name |
| location_admin | workspace owner |
| campaign_creator | campaign creator |
| campaign_approver | approver |
| campaign_publisher | publisher |
| viewer, analyst | viewer |
| platform_support | support |
| persisted, frozen, immutable version | saved, this version |
| preflight, deterministic gate | the checks, campaign check |
| preflight passed / blocked | Ready for approval / Needs changes |
| finding, rule code | what to fix (with the plain explanation first) |
| provider publication remains disabled | This campaign won't run as an ad yet. HighLevel and Meta aren't connected. |
| not connected (kept), no live observation | not connected yet, not live yet |
| synthetic data, demo fixtures | not live data (on the deployed workspace, before anything is connected), sample data (local demo only) |
| review surface | this workspace (with the not-connected notice) |
| correlation ID, exception code | support reference |
| session, sign-in session | you're signed in, sign out |
| verified first-party session | signed in with your email |
| authorized resolver, responsible party | who can do this |
| required role | who can do this |
| next safe action | what to do next |
| evidence, verification | what was checked, checked on <date> |
| degraded | having trouble |
| stale | needs a refresh |
| entitlement, plan restricted | not included in your plan |
| permission restricted | you don't have access to this |

## 5. Honesty in user language

The product's not-connected states are a compliance commitment, not a style choice. They stay true to the letter. What changes is the register. These are the exact strings, and they live as shared constants in `apps/web/src/copy/user-language.ts` so no screen can drift from them.

| Surface | String |
|---|---|
| Banner headline | Not connected yet |
| Banner body | HighLevel, Meta, and Stripe aren't connected to this workspace yet, so nothing here is live and nothing can be published. |
| Banner accessible name | Not connected yet: HighLevel, Meta, and Stripe |
| A region's detail | Not connected yet. |
| A region's source | HighLevel, Meta, and Stripe aren't connected. |
| A metric's source | Not live yet. Connect Meta and HighLevel to see spend and leads here. |
| A metric's freshness | Not live yet |
| What to do next | Connect HighLevel, Meta, and Stripe when you're ready. Nothing here changes until you do. |
| A locked navigation item | Available once your accounts are connected. |
| A setup step with nothing to check | Nothing to check yet. This step waits for a connected account. |
| Who does that step | You, once you connect |
| A metric that is not a live reading | Not live data |

Three rules follow from those strings:

1. **Never present a figure as live when it is not.** A number with no live source shows the words, not a zero.
2. **Never soften a truth into a hint.** "Not connected yet" is the whole truth; "Coming soon" is not.
3. **Always say what the user can do.** A not-connected state ends with the next step or with an explicit "nothing changes until you do".

## 6. References, hashes, and codes: "Details for support"

Version references, content fingerprints, rule codes, and support references are real and are kept. They are never names, headings, or inline prose. They live in exactly one place per screen: a collapsed `<details>` region titled **Details for support**, closed by default, with plain labels and monospace values.

| Label | What it holds |
|---|---|
| Version ID | The saved campaign version reference |
| Content fingerprint | The content hash of that version |
| Check fingerprint | The hash of the check result for that version |
| Rule | The code of one rule the checks reported |
| Support reference | The reference support asks for when something goes wrong |

Nothing outside that region shows an identifier. Nothing inside it is a session value, a token, or a hash of one.

## 7. Error codes become sentences

No `SCREAMING_SNAKE` code ever reaches a status line. Every code a route can return maps, in `apps/web/src/features/http/user-messages.ts`, to a pair of plain sentences: what happened, and what to do. An unmapped code renders a generic sentence plus the support reference, and a unit test asserts that every code the routes export has a mapping.

## 8. How this is enforced

| Guard | What it catches |
|---|---|
| `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts` | A forbidden term, an identifier pattern, or a dash in a user-facing string in the source, reported with file and line. Ships with a self-test that plants one string and asserts the guard reports it. |
| `apps/web/src/app/(authenticated)/review-surface-sweep.ts` and the six review-surface integration suites | A forbidden term or identifier in what a page actually renders, including its accessible names, described-by targets, and `<code>` content. |
| `technical-writing-craft-guardian` | The reader lens. A string can pass both guards and still be written for the wrong person. A blocking finding stops the merge. |

The guards are a floor, not the contract. When a guard and this document disagree, this document wins and the guard is fixed.
