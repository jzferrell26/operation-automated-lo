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

## Profile contracts

### Brand profile

- Public loan officer and company names
- NMLS and license display values
- Logo, headshot, palette, typography, contact fields, and approved URLs
- Voice instructions, approved proof points, banned phrases, and allowed merge tokens
- Email sender identity and physical address

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

## Out of scope

- Automated lender disclosure interpretation
- Automatic NMLS or license verification
- General-purpose brand interrogation
- Realtor CRM or team management

## Verification

- Versioning, rollback, one-current-version, upload, URL, tenant-isolation, and mapping-staleness tests pass.
- A complete profile can generate the same normalized manifest repeatedly.
- Lender compliance approves the field set and profile workflow before production.
