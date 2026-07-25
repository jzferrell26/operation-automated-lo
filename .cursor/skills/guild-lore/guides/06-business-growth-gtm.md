# Pillar 6: Business, Growth & GTM

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `affiliate-referral-program-weapon`: owns affiliate/referral platform selection, attribution, payout automation, and fraud detection.
- `alt-ads-platforms-weapon`: owns paid acquisition on channels beyond Meta/Google Search (LinkedIn, TikTok, Reddit, Microsoft, Pinterest, Quora, YouTube, Spotify).
- `blogging-content-strategy-weapon`: owns editorial content architecture, keyword scoping, and AEO-formatted publishing cadence.
- `cold-outreach-weapon`: owns outbound cold email programs: tool selection, deliverability/warmup, sequence design, AI personalization discipline.
- `customer-support-tooling-weapon`: owns the support-stack decision layer (Plain, Pylon, Front, Help Scout, Intercom) and AI deflection configuration.
- `hiring-ats-weapon`: owns ATS platform selection, pipeline-stage design, scorecard calibration, and D&I/EEOC reporting.
- `hr-payroll-weapon`: owns payroll and EOR platform selection, worker classification, and the equity-to-payroll handoff.
- `incorporation-startup-stack-weapon`: owns company formation platform selection, entity type, EIN, banking, and the 83(b) deadline.
- `investor-cap-table-weapon`: owns cap-table platform selection, SAFEs, priced rounds, 409A valuations, and data-room prep.
- `knowledge-base-help-center-weapon`: owns customer-facing knowledge-base platform selection, search-first architecture, and AI deflection.
- `legal-docs-weapon`: owns SaaS legal document generation (ToS, Privacy Policy, DPA, MSA) via the template-plus-lawyer-review path.
- `live-chat-support-weapon`: owns live-chat widget integration, HMAC/JWT identity verification, and conversation routing.
- `newsletter-platform-weapon`: owns newsletter platform selection, embedded signup, deliverability tradeoffs, and monetization.
- `product-feedback-roadmap-weapon`: owns the feedback-to-roadmap loop: platform selection, de-duplication, RICE/ICE prioritization.
- `review-funnels-g2-weapon`: owns review-collection platform strategy (G2, Trustpilot, Product Hunt) and incentive-compliance rules.
- `social-media-marketing-organic-weapon`: owns genuine organic social strategy for solo founders and small teams, explicitly rejecting AI-slop and automation shortcuts.
- `app-store-submission-weapon`: owns iOS/Android app-store publication: ASO, privacy compliance, rejection diagnosis, IAP setup.
- `code-forensics-weapon`: owns forensic investigation of software/agency engagements for fee-clawback, fraud, and breach-of-contract evidence packets.

---

## What this pillar collectively knows

This pillar covers everything about running the business around the product: acquiring customers (paid, organic, cold outreach, referral), supporting them once acquired (chat, KB, feedback loop), the back-office machinery that makes a company legally and financially real (incorporation, cap table, payroll, hiring), reputation and distribution (reviews, app stores), and the rare adversarial case where a vendor engagement itself needs to be investigated. It is the widest pillar because GTM and back-office concerns are numerous but shallow relative to engineering pillars; most of these weapons are platform-selection specialists rather than implementation specialists.

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| Affiliate program setup, attribution, payout fraud | `affiliate-referral-program-weapon` | `cold-outreach-weapon` (outbound sales, not partner programs) |
| LinkedIn/TikTok/Reddit paid ads | `alt-ads-platforms-weapon` | `social-media-marketing-organic-weapon` (organic, not paid) |
| What to blog about, title/meta craft, publishing cadence | `blogging-content-strategy-weapon` | `seo-aeo-weapon` (Pillar 1, technical SEO not editorial strategy) |
| Cold email sequences, deliverability, Apollo/Clay/Instantly | `cold-outreach-weapon` | `newsletter-platform-weapon` (opted-in channel, not cold) |
| Choosing a support tool, SLA tiers, AI deflection config | `customer-support-tooling-weapon` | `live-chat-support-weapon` (widget/HMAC mechanics, not tool selection) or `knowledge-base-help-center-weapon` (self-serve docs, not inbox) |
| ATS platform, scorecards, EEOC reporting | `hiring-ats-weapon` | `hr-payroll-weapon` (post-hire, not pipeline) |
| Payroll platform, EOR, W-2/1099 classification | `hr-payroll-weapon` | `investor-cap-table-weapon` (equity, not cash comp) |
| Delaware C-Corp vs LLC, EIN, 83(b) election | `incorporation-startup-stack-weapon` | `investor-cap-table-weapon` (post-formation fundraising) |
| SAFEs, 409A, option pool sizing, Series A data room | `investor-cap-table-weapon` | `incorporation-startup-stack-weapon` (formation itself) |
| Self-serve docs platform, AI deflection via llms.txt | `knowledge-base-help-center-weapon` | `docs-site-weapon` (Pillar 7, developer docs not customer-facing KB) |
| ToS, Privacy Policy, DPA, GDPR/CCPA posture | `legal-docs-weapon` | none |
| Chat widget HMAC identity verification, conversation routing | `live-chat-support-weapon` | `customer-support-tooling-weapon` (broader stack decision) |
| Beehiiv/ConvertKit/Substack platform choice | `newsletter-platform-weapon` | `blogging-content-strategy-weapon` (long-form content, not the email channel) |
| Canny/Featurebase setup, RICE scoring, public roadmap | `product-feedback-roadmap-weapon` | none |
| G2/Trustpilot/Product Hunt strategy, incentive compliance | `review-funnels-g2-weapon` | none |
| LinkedIn/X/Threads organic voice, build-in-public | `social-media-marketing-organic-weapon` | `alt-ads-platforms-weapon` (paid, not organic) |
| ASO, App Store/Play Store rejection, IAP | `app-store-submission-weapon` | none |
| Building a fee-clawback or fraud evidence packet against a vendor | `code-forensics-weapon` | `security-weapon` (Pillar 3, routine vuln audit without a damages claim) |

### Canonical multi-weapon sequences

1. **Acquisition stack build:** `alt-ads-platforms-weapon` and `cold-outreach-weapon` cover paid and outbound respectively → `social-media-marketing-organic-weapon` covers the organic channel → `blogging-content-strategy-weapon` feeds long-form content that both organic social and SEO (Pillar 1) draw on.
2. **Support stack bring-up:** `customer-support-tooling-weapon` picks the inbox/ticketing platform and SLA tiers → `live-chat-support-weapon` wires the widget and identity verification → `knowledge-base-help-center-weapon` builds the self-serve deflection layer → `product-feedback-roadmap-weapon` closes the loop by routing unresolved requests into a prioritized backlog.
3. **Company formation to first raise:** `incorporation-startup-stack-weapon` handles entity formation, EIN, banking, and the 83(b) deadline → `investor-cap-table-weapon` takes over for SAFEs, priced rounds, and data-room prep → `hr-payroll-weapon` and `hiring-ats-weapon` come online once the company starts hiring.
4. **Forensic investigation (a one-Guardian sequence, does not chain onward):** `code-forensics-weapon` runs its full methodology (intake, email processing, invoice forensics, git-log effort calibration, deliverable synthesis, pre-litigation pack) and stops at "drafted for retained counsel to evaluate." No downstream weapon takes over; service of any document is a legal decision outside the Guild's scope.

### Load-bearing hard rules and gotchas

- **`code-forensics-weapon` produces evidence, not legal advice** — it never crosses into practicing law; retained counsel makes all filing and strategy decisions.
- **G2/review-incentive compliance is governed by the FTC Consumer Reviews Rule**, not just platform terms, per `review-funnels-g2-weapon` — an incentive structure that is platform-compliant can still be FTC-non-compliant.
- **The 83(b) election has a hard 30-day deadline from grant date** per `incorporation-startup-stack-weapon` — missing it is irreversible, unlike most other startup paperwork.
- **`social-media-marketing-organic-weapon` explicitly rejects AI-generated posts and cross-post automation** as a design principle, not a preference — do not recommend automation shortcuts when this weapon is loaded.
- **Worker classification (W-2 vs 1099 vs EOR vs PEO) is jurisdiction-dependent** per `hr-payroll-weapon` — never assume a domestic classification pattern applies to an international hire.
- **App Store and Play Store rejections require the two-interpretation protocol** per `app-store-submission-weapon`: read the rejection reason two ways (literal and adjacent) before resubmitting, since resubmitting on a misread often triggers a second rejection.

---

## Cross-references to sibling pillars

- Technical SEO (schema markup, Core Web Vitals) that content strategy here feeds into is **Pillar 1: Frontend & Design Systems**.
- Security review of any customer-data-handling integration (support tools, KB platforms) closes out through **Pillar 3: Security, Quality & Code Review**.
- GoHighLevel-specific CRM and SMS work for Cuantico clients is **Pillar 8: Cuantico Operator**, not this pillar's generic CRM/support tooling.
- Product process discipline (OKRs, roadmapping methodology, PRD authorship) that GTM initiatives should be tracked against lives in **Pillar 7: Product Process & Documentation**.
