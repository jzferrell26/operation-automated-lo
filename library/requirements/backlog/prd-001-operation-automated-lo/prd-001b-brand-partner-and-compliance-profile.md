# PRD 001b: Brand, Partner, Compliance, and Routing Profiles

## Goal

Collect every reusable tenant input once, validate it, version it, and make it available to deterministic campaign generation.

## Scope

- Loan officer brand profile
- Lender and compliance profile
- Realtor partner profile and approval status
- GHL routing profile
- Append-only versioning and rollback
- Setup wizard and completeness state
- Server-verified onboarding readiness contribution
- AI-assisted brand-sample extraction and profile drafting with field-level confirmation

## Profile contracts

### Brand profile

- Public loan officer and company names
- NMLS and license display values
- Logo, headshot, palette, typography, contact fields, and approved URLs
- Voice instructions, approved proof points, banned phrases, and allowed merge tokens
- Email sender identity and physical address
- Approved marketing sample references, source permission, suggested voice fields, confirmation state, and compact prompt snapshot

### Compliance profile

- Lender-approved disclosure blocks by campaign type, channel, state, and claim type
- Equal Housing and other required assets
- Rate and payment claim policy
- Approval-role requirement
- Consent disclosure versions
- Data-retention policy reference

### Partner profile

- Realtor and brokerage public identity
- License and contact display values
- Headshot and logo
- Co-brand permission status and evidence
- Campaign approval preferences

### Routing profile

- GHL owner or assignment rule
- Pipeline and starting stage
- Calendar
- Namespaced campaign tags
- Optional existing workflow ID
- Contact and opportunity field mapping

## Acceptance criteria

- Every profile is validated at the API boundary.
- Brand and compliance edits append a new version instead of overwriting history.
- Exactly one current version exists per location and profile type.
- A user can preview and roll back to a previous version without deleting history.
- Partner profile changes preserve the snapshot used by prior campaigns.
- Uploaded images are type-checked, size-limited, decoded and re-encoded, stripped of metadata, and stored privately until approved.
- URLs use an allowlist of supported schemes and are not fetched from private network ranges.
- Setup shows missing required fields for Open House Boost.
- GHL pipeline, calendar, user, workflow, field, and tag selections are stored by provider ID plus safe display metadata.
- GHL objects are revalidated before use and a missing mapping blocks publish or lead routing as appropriate.
- The user attests that brand, license, disclosure, Realtor, and asset values are authorized and current.
- The product does not claim that profile completion constitutes legal approval.
- The setup wizard saves after each verified section and resumes on another authenticated device.
- Required fields are determined by the selected blueprint, location, lender policy, state, and channel instead of a hardcoded universal checklist.
- Profile completion contributes to Launch Ready only after provider mappings and uploaded assets are revalidated.
- The model may suggest voice, tone, pattern, framework, signature-language, and banned-language fields from approved samples, but no suggestion becomes current until a user confirms it.
- Identity, license, NMLS, lender, disclosure, rate, proof, consent, and partner-permission fields cannot be inferred into an approved state.
- Brand samples are rejected or quarantined when they contain borrower, application, credit, income, bank, Social Security, or private CRM data.
- One compact prompt snapshot and deterministic brand ruleset are compiled from the same confirmed version and cannot drift independently.

## Out of scope

- Automated lender disclosure interpretation
- Automatic NMLS or license verification
- General-purpose brand interrogation
- Fine-tuning or retaining a cross-tenant model from customer samples
- Realtor CRM or team management

## Verification

- Versioning, rollback, one-current-version, upload, URL, tenant-isolation, and mapping-staleness tests pass.
- A complete profile can generate the same normalized manifest repeatedly.
- Lender compliance approves the field set and profile workflow before production.
