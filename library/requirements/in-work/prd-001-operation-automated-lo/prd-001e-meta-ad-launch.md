# PRD 001e: Meta Ad Launch Through HighLevel

## Goal

Discover the location's connected Meta assets, create a campaign draft from an approved Open House Boost version, require an exact final confirmation, publish through HighLevel, and report live state.

The paid campaign follows the established loan-officer or lender-branded lead-generation model used for approved client campaigns. Realtor and brokerage identity are prohibited from the paid ad, even when the related page, flyer, PDF, or QR collateral is co-branded.

## Scope

- `adPublishing.readOnly` discovery and reporting
- `adPublishing.write` allowlisted Meta operations
- Meta page, Instagram identity, ad account, form, pixel, targeting, and budget selection
- Draft creation and provider read-back
- Publish progress
- Pause and resume
- Normalized reporting and health
- Audit, idempotency, and reconciliation

## Permission decision

Before public release, validate whether Ads Publisher can be a separate Marketplace capability or companion app. If one app must hold `adPublishing.write`, enforce a server-side action allowlist and complete a dedicated security review because the scope includes destructive, audience, Google, LinkedIn, integration, and reselling endpoints.

## Acceptance criteria

### Connection discovery

- The app shows whether Meta integration is connected for the active location.
- The app fetches only assets exposed through HighLevel for that location.
- The user selects an ad account, page, optional Instagram identity, lead form, and pixel by provider ID and safe display name.
- Missing, disconnected, disapproved, or inaccessible assets block launch with a specific remediation.

### Mortgage and housing controls

- The blueprint always uses the lender-approved Special Ad Category value or combination proven by HighLevel App Test for its exact campaign type.
- Property-only, mortgage-only, and combined property-plus-mortgage campaign fixtures are tested separately. The product does not assume that one legacy category fits all three.
- Targeting UI exposes only the approved geographic and platform fields.
- Age, gender, marital status, parental status, ZIP, protected-class proxies, custom audiences, and lookalike audiences are unavailable.
- Budget and duration must fit tenant and platform bounds.
- The approval summary displays every target, exclusion, budget, and date.

### Draft

- The adapter compiles the frozen campaign version into the current HighLevel Meta contract.
- The adapter consumes only the Realtor-free paid-ad projection and cannot read Realtor or brokerage presentation fields while compiling provider payloads.
- Ad copy, creative, lead-form presentation, advertiser identity, and calls to action use loan-officer or lender branding only.
- A command idempotency key is reserved before the provider write.
- Provider IDs are saved only after a confirmed response or successful read-back.
- The app reads the draft back and compares it with the approved version.
- A mismatch blocks publish and records the fields that differ.

### Publish

- Publish requires publisher role, current successful preflight, current required approvals, exact version match, healthy token, and connected assets.
- The user confirms the final launch summary in the publish action.
- Publish runs as a durable job and polls HighLevel's publishing-progress endpoint to a terminal state.
- An uncertain response triggers read-back and reconciliation before a retry.
- Every attempt records a safe request summary, provider IDs, response classification, actor, approval, idempotency key, and correlation ID.

### Live operations

- Authorized users can pause and resume with explicit confirmation.
- Budget, targeting, creative, copy, form, date, page, or ad-account changes require a new campaign version and approval.
- Deletion is not exposed.
- Automatic budget or targeting optimization is not implemented.

### Reporting

- The system reads normalized spend, impressions, clicks, leads, cost per lead, status, and available health signals from HighLevel.
- Reporting clearly labels provider freshness and last successful sync.
- Missing or delayed provider data does not fabricate zeros.

### Forbidden operations

- No paid ad can contain Realtor or brokerage names, images, logos, contact information, or dual-brand treatment.
- No delete endpoint can be invoked by product code.
- No custom-audience member operation can be invoked.
- No Meta integration or ad-account disconnect can be invoked.
- No Google, LinkedIn, reselling, subscription, or ad-credit operation can be invoked.
- Automated tests assert that only documented route templates and HTTP methods exist in the adapter allowlist.

## Out of scope

- Google Ads
- LinkedIn Ads
- Ad-spend rebilling
- Client credit wallets
- Automatic optimization
- Direct Meta OAuth or Graph API credential storage

## Verification

- HighLevel App Test proves connection discovery, draft, read-back, explicit publish, publish progress, pause, resume, reporting, expired token, disconnection, provider rejection, duplicate command, and uncertain response.
- HighLevel App Test records accepted Special Ad Category values and combinations for property-only, mortgage-only, and combined campaign fixtures, plus the targeting fields actually accepted for each.
- No-spend test assets are used until lender compliance and an authorized operator approve a controlled live test.
