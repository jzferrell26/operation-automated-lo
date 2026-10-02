# User Language Contract

> Category: Standard | Version: 1.1 | Date: October 2026 | Status: Approved
> Source: [PRD-006b](../../../requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/prd-006b-first-party-sign-in-and-guided-experience-user-language.md) D1 through D4 and D8, extended by [PRD-008c](../../../requirements/completed/prd-008-finish-line-hardening/prd-008c-finish-line-hardening-user-language-completion.md) (`adapter`, `origin`, the administrator-instruction phrase rule, and the user-facing error classes) and recorded here under PRD-008e `008E-AC-015`

Every word a user reads in Operation Automated LO is written for a mortgage loan officer who has never seen this codebase. This document is the rule. It governs product copy, page titles, the site description, accessible names, placeholders, help text, error messages, and the account emails. It does not govern code identifiers, database column names, log lines, test names, or anything else a user never sees.

**Related:**

- [Documentation framework](documentation-framework.md)
- [UX/UI source of truth](../ux-ui/README.md)
- [What Automated LO does today](../../public/overview/what-is-automated-lo.md)
- [Launch an ad FAQ](../../public/faqs/open-house-boost-faq.md) _(Amended on 2026-10-01 by PRD-009 (S-98; OD-H, D-16): the link text was "Open House Boost FAQ" and now follows the FAQ's new title (S-79); the file name is kept so inbound links resolve.)_

---

## 1. Who is reading

A loan officer who runs open houses with Realtor partners. They know mortgages, compliance, open houses, and their CRM. They do not know what a session is, what a hash is, what a projection is, or what the product calls things internally. They opened the product to get one open house campaign made and approved. _(Amended on 2026-10-01 by PRD-009 (S-99; OD-H): the reader is a loan officer who launches ready-made ads from the library; the writing review of PRD-009 (MTK-008) reads strings against this amended section.)_

## 2. Voice and tone

1. **Second person, present tense, active voice.** "You can approve this", not "Approval may be recorded by an authorized approver."
2. **Plain words over precise-sounding words.** "Saved", not "persisted". "Checks", not "preflight". "Your workspace", not "location". "Approver", not "campaign_approver".
3. **Specific over abstract.** Name what the product did, will do, or cannot do yet. "Meta isn't connected yet, so this campaign won't run as an ad", not "Provider publication remains disabled."
4. **Warm, not chatty.** No exclamation marks in status copy. One idea per sentence.
5. **Sentence case** for headings, buttons, and labels. Product names keep their casing: Open House Boost, HighLevel, Meta, Stripe, Automated LO. _(Amended on 2026-10-01 by PRD-009 (S-76; D-16): Open House Boost is retired from product copy; the flow's names (Ads library, Launch an ad, Choose an ad, Set it up, Review and launch) are ordinary sentence-case words.)_
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
| Connections and addresses | adapter, origin |
| Identifiers | any `location_`, `actor_`, `principal_`, `installation_`, `session_`, `campaign_`, `correlation_`, `syn-` or `synthetic-` prefixed reference; any UUID; any 64-hex hash; any `OALO_*` or `NEXT_PUBLIC_*` name; any `SCREAMING_SNAKE` code; any `snake_case` state or role token |

### How the automated guard reads this table

Most terms are banned outright and matched case-insensitively on a word boundary. Five entries carry a qualifier in the table ("as a software noun", "as a noun for a page", "as a noun for a page area", "as an access noun", and the instruction to name the provider). Those are still banned outright in user copy, because none of them has a user-facing sense in this product. The one word with a real user-facing sense is the geographic sense of "region" in ad targeting; the product says "area" there instead, so the ban holds without an exception. Where the guard cannot decide, the contract decides, and the guard is narrowed with a comment naming this section.

"Route" carries the same qualifier ("as a noun for a page") and gets the same narrow treatment for a different reason: the guard bans only the exact word "route" (and its plural), not every inflection, because "routing" is the name HighLevel gives to sending a lead to the right person, and this product has a "Routing" health area and a `/settings/routing` page that name that feature, not a page. A loan officer reads "routing" as the feature's name, the same way "regional" is not read as a ban on "region". Both narrowings are pinned in `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts` so neither can move without the other being considered.

"Adapter" and "origin" are matched like the other terms: case-insensitive, on a word boundary, with the regular plural and verb endings. A word that merely starts with "origin", such as "original" or "originated", is not caught, in the same way "regional" is not caught by a ban on "region". The product says "connection" where an engineer would say adapter, and "web address" where an engineer would say origin. PRD-008c added both after a valuation status line and a report-link refusal used them in front of loan officers.

**The administrator-instruction phrase rule.** A word list cannot see a sentence made of plain words that is addressed to the wrong person. "Set the report website address before sharing." contains no banned word, but it hands an administrator's job to a loan officer, who has no control to set it with, and an instruction the reader cannot follow is not a next step (section 5, rule 3). So the guard also bans one shape, which it reports as a `phrase` hit named "setup instruction for an administrator": the verb "set" or "configure" (optionally followed by "up"), then "the" or "this", then up to three words, then one of address, url, origin, key, secret, token, variable, environment, or setting(s). It is narrow on purpose. "Set a budget for the campaign", "Set your company name and NMLS number", "Set the date and time of the open house", "Contact support to get it set up", and "Your settings are saved" all pass. The replacement says what is true and sends the reader to support: "We can't create a report link yet because its web address isn't set up. Contact support so we can finish the setup." Both guards in section 8 apply the rule.

**User-facing error classes.** The source guard reads the TypeScript syntax tree. It treats text inside a thrown `Error`, a `console` call, or a class whose name ends in `Error` as log text and does not hold it to this contract, because a route that throws renders the page boundary's own sentence and never the error's text. One list carves a narrow exception: `USER_FACING_ERRORS` in `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts` names the error classes whose message a person does read. Today it holds `HomeownerError`: `homeError` in `apps/web/src/server/homeowners/http.ts` puts its message in the response body, and the homeowner report screen shows it (`apps/web/src/features/homeowners/use-home-workspace.ts`). A class joins the list only when something renders its message, and any other thrown error stays exempt. The guard's scanned roots include `apps/web/src/server/homeowners` for the same reason.

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
| adapter | connection ("Your valuation connection is set up for this workspace.") |
| origin | web address |
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
| Banner headline | Not connected yet _(Superseded on 2026-10-01 by PRD-009 (S-77; D-11): no shell-wide banner shows this headline any more (009A-AC-013).)_ |
| Banner body | HighLevel, Meta, and Stripe aren't connected to this workspace yet, so nothing here is live and nothing can be published. _(Superseded on 2026-10-01 by PRD-009 (S-77; D-11): the banner is retired. The disclosure sentence now appears only as a page's own statement, and names only HighLevel and Meta: "HighLevel and Meta aren't connected to this workspace yet, so nothing here is live and nothing can be published.")_ |
| Banner accessible name | Not connected yet: HighLevel, Meta, and Stripe _(Superseded on 2026-10-01 by PRD-009 (S-77; D-11): deleted with the banner.)_ |
| A section's detail | Not connected yet. |
| A section's source | HighLevel, Meta, and Stripe aren't connected. _(Amended on 2026-10-01 by PRD-009 (S-77; D-8): now "HighLevel and Meta aren't connected.")_ |
| A metric's source | Not live yet. Connect Meta and HighLevel to see spend and leads here. |
| A metric's freshness | Not live yet |
| What to do next | Connect HighLevel, Meta, and Stripe when you're ready. Nothing here changes until you do. _(Amended on 2026-10-01 by PRD-009 (S-77; D-8): now "Connect HighLevel and Meta when you're ready. Nothing here changes until you do.")_ |
| A locked navigation item | Available once your accounts are connected. |
| A setup step with nothing to check | Nothing to check yet. This step waits for a connected account. |
| Who does that step | You, once you connect |
| A metric that is not a live reading | Not live data |

> **Amended on 2026-10-01 by PRD-009** (S-77; D-8, D-11, 009F-AC-008): the three banner rows are retired with the shell-wide banner (009A-AC-013), and the section-source and next-step rows now name only HighLevel and Meta, because a sentence about the ads names the two accounts the ads need. No connection sentence names Stripe (a search of the product source on 2026-10-02 finds none); billing sits under Settings, Account, as "Plan and usage". The constants in `apps/web/src/copy/user-language.ts` carry the amended strings, and the three rules below still stand.

Three rules follow from those strings:

1. **Never present a figure as live when it is not.** A number with no live source shows the words, not a zero.
2. **Never soften a truth into a hint.** "Not connected yet" is the whole truth; "Coming soon" is not.
3. **Always say what the user can do.** A not-connected state ends with the next step or with an explicit "nothing changes until you do".

## 6. References, hashes, and codes: "Details for support"

Version references, content fingerprints, rule codes, and support references are real and are kept. They are never names, headings, or inline prose. They live in exactly one place per screen: a collapsed `<details>` element titled **Details for support**, closed by default, with plain labels and monospace values.

| Label | What it holds |
|---|---|
| Version ID | The saved campaign version reference |
| Content fingerprint | The content hash of that version |
| Check fingerprint | The hash of the check result for that version |
| Rule | The code of one rule the checks reported |
| Support reference | The reference support asks for when something goes wrong |

Nothing outside that element shows an identifier. Nothing inside it is a session value, a token, or a hash of one.

## 7. Error codes become sentences

No `SCREAMING_SNAKE` code ever reaches a status line. Every code a route can return maps, in `apps/web/src/features/http/user-messages.ts`, to a pair of plain sentences: what happened, and what to do. An unmapped code renders a generic sentence plus the support reference, and a unit test asserts that every code the routes export has a mapping.

## 8. How this is enforced

| Guard | What it catches |
|---|---|
| `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts` | A forbidden term, an identifier pattern, a setup instruction for an administrator (the phrase rule in section 3), or a dash in a user-facing string in the source, reported with file and line. It also reads the messages of the error classes a person sees (`USER_FACING_ERRORS`, today `HomeownerError`) and the homeowner report server directory. Ships with a self-test that plants one string and asserts the guard reports it. |
| `apps/web/src/app/(authenticated)/review-surface-sweep.ts` and the six review-surface integration suites | A forbidden term, identifier, or administrator-instruction phrase in what a page actually renders, including its accessible names, described-by targets, and `<code>` content. |
| `technical-writing-craft-guardian` | The reader lens. A string can pass both guards and still be written for the wrong person. A blocking finding stops the merge. |

The guards are a floor, not the contract. When a guard and this document disagree, this document wins and the guard is fixed.
