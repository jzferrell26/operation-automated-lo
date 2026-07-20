# HighLevel Marketplace, OAuth, and Scope Plan

## Recommended Marketplace configuration

| Setting | Recommendation | Reason |
| --- | --- | --- |
| Target user | Sub-account | The loan officer uses the product inside one operating location. |
| Who can install | Agency and sub-account | Individual mortgage teams can install directly, while agencies can distribute it. |
| Bulk install | Yes | Agencies can install to multiple mortgage locations and future locations. |
| UI module | Custom Page in sub-account navigation | The app feels native to HighLevel while its application is hosted and released independently. |
| Initial distribution | Private App Test and one-agency founding beta | OAuth and ad behavior must be proven before public review. |
| Public path | Public Marketplace listing or private security review | Private apps created after November 18, 2025 are limited to five agencies. |
| Billing | External billing for the founding cohort, then evaluate Marketplace billing | The $500 founding offer includes service and validation that do not fit a simple app subscription. |

HighLevel's current distribution flow can return a location token for direct sub-account installs. Agency bulk installs can return a company token, after which the application enumerates installed locations and exchanges for location tokens. The application must also process install and uninstall events so token and tenant state follow the actual Marketplace installation.

## Embedded application model

The primary app UI is an externally hosted Custom Page rendered inside HighLevel. It should also support a direct first-party URL for support and environments where third-party cookie restrictions affect the iframe.

Do not trust `location_id`, email, role, or other URL query parameters as authentication. Request HighLevel's signed user context from the parent frame, send the encrypted value to the backend, validate or decrypt it there with the Marketplace shared secret, and create a short-lived application session bound to:

- `companyId`
- `activeLocation`
- `userId`
- HighLevel role
- app version and status

The browser never receives a HighLevel OAuth access token, refresh token, client secret, or shared secret.

## OAuth lifecycle

1. Generate a cryptographically random nonce and signed, expiring state.
2. Redirect to the exact registered HTTPS callback URL.
3. Validate state before exchanging the authorization code.
4. Exchange the code only from the backend.
5. Bind the returned company or location identity to the expected install event.
6. Encrypt access and refresh tokens using an envelope key from the production secrets system.
7. Record granted scopes, token type, expiry, app version, company ID, and location ID.
8. Refresh proactively before expiry and rotate the stored refresh token after each successful refresh.
9. On `401`, allow one coordinated refresh and one retry. Prevent parallel refresh storms with a tenant-scoped lock.
10. Disable commands and require reconnection if refresh fails or the app is uninstalled.

HighLevel currently documents access tokens as valid for one day and refresh tokens as valid for one year, with refresh rotation. Treat the returned expiration fields as authoritative instead of hardcoding these durations.

## Scope profiles

The scopes page is an endpoint-to-scope catalog, not a menu of narrowly separated operations. Several write scopes include destructive endpoints. Application authorization must therefore be narrower than OAuth permission alone.

### Profile A: Core campaign workspace

| Scope | Needed for | Initial use |
| --- | --- | --- |
| `locations.readonly` | Location brand and business context | Read only |
| `users.readonly` | Loan officer and owner selection | Read only |
| `contacts.readonly` | Match and attribute captured leads | Read only |
| `contacts.write` | Create or update a captured lead, tag it, or add it to a configured workflow | Create, update, tag, add-to-workflow only. Never delete. |
| `opportunities.readonly` | Pipeline and outcome reporting | Read only |
| `opportunities.write` | Create or update the campaign opportunity | Create and update only. Never delete. |
| `locations/tags.readonly` | Resolve configured campaign tags | Read only |
| `locations/tags.write` | Create a missing namespaced tag during approved setup | Create only in setup. Never delete. |
| `locations/customFields.readonly` | Resolve configured field IDs | Read only |
| `locations/customFields.write` | Optional namespaced setup fields | Defer unless the vertical slice proves they are required. Never delete. |
| `calendars.readonly` | Select the campaign appointment calendar | Read only |
| `calendars/events.readonly` | Read attributed appointments when appointment reporting is enabled | Read only |
| `forms.readonly` | Discover existing GHL forms and submissions where supported | Read only |
| `workflows.readonly` | Select the existing approved workflow used for follow-up | Read only |
| `adPublishing.readOnly` | Discover Meta connections, assets, campaigns, reports, and account health | Read only |

The exact `users.readonly` endpoint behavior and each selected scope must be validated in the App Test account because the public scope catalog changes over time.

### Profile B: Agency bulk installation

| Scope | Needed for |
| --- | --- |
| `oauth.readonly` | Get locations where the app is installed. |
| `oauth.write` | Exchange the agency token for a location token. |

Use these only in the server-side bulk-install path. Confirm during App Test that the chosen distribution model permits both direct sub-account installs and agency bulk installs with this scope combination.

### Profile C: Ads Publisher capability

| Scope | Needed for | Risk |
| --- | --- | --- |
| `adPublishing.write` | Create, publish, pause, resume, and update Meta campaigns, ad sets, and ads through HighLevel | This one scope also exposes destructive actions, integration changes, custom-audience member operations, Google and LinkedIn writes, and ad-reselling actions. |

Preferred public architecture: keep the core product on Profiles A and B, and request Profile C only through a separately reviewed Ads Publisher capability or companion app. This is the closest available design to least privilege.

Founding-beta fallback: use one private app with `adPublishing.write`, but enforce a server-side action allowlist and do not expose the following operations:

- Delete ad, ad set, campaign, pixel, integration, segment, audience, or ad account
- Upload, add, remove, or batch-update custom-audience members
- Purchase, subscribe, unsubscribe, or alter ad-reselling plans
- Publish to Google or LinkedIn
- Change a live budget without a new approval record

Whether HighLevel accepts paired core and Ads Publisher applications should be confirmed before public Marketplace submission.

Public documentation does not establish the paired-app pattern as approved. Treat written HighLevel confirmation as an implementation gate, not a post-build question. If HighLevel rejects it, the one-app fallback requires the broad-scope warning, allowlist tests, and dedicated security review before the first production install.

## Self-onboarding permission contract

Onboarding validates two different permission layers: HighLevel installation authority and Operation Automated LO application roles.

### HighLevel authority

- A direct sub-account install must be initiated by a user permitted to install Marketplace applications for that location.
- An agency bulk install may create the location installation, but each location still requires an authorized location administrator to confirm brand, compliance, routing, Meta assets, and team roles.
- The application derives company, location, user, and HighLevel role from signed user context. A query parameter or form field never supplies authority.
- Missing or declined OAuth scopes produce a blocked step with the exact required capability and a reconnect action. The app never presents partial access as complete setup.

### Scope activation

The onboarding permission screen groups permissions by business purpose and links them to the existing scope profiles:

1. **Core workspace:** Profile A scopes for location context, users, contacts, opportunities, routing metadata, calendars, forms, workflows, and read-only ad discovery.
2. **Agency bulk install:** Profile B scopes only when the app is installed and managed through an agency.
3. **Ads Publisher:** Profile C only when the customer activates Meta publishing. Prefer the separately reviewed capability; if HighLevel requires one app, display the broad-scope warning and keep the documented server-side action allowlist.

Scopes are not application roles. OAuth permission only makes an endpoint technically callable. Every command still requires the correct application role, active installation, tenant, current approval, and allowlisted operation.

### Default application-role mapping

| Role | Onboarding behavior |
| --- | --- |
| `location_admin` | Granted to the installer only when signed context confirms appropriate HighLevel authority. Can configure the location and assign non-support application roles. |
| `campaign_creator` | Can create and edit drafts after setup. Cannot alter installation, token, or tenant compliance settings. |
| `campaign_approver` | Can approve the exact frozen version when tenant policy permits. |
| `campaign_publisher` | Can publish, pause, and resume after all command gates pass. |
| `viewer` | Can read dashboards and campaign history. |
| `platform_support` | Never self-granted. Time-limited audited access only. |

One user may hold multiple business roles for a small team, but the setup summary must make that concentration visible. Platform support cannot silently complete customer attestations, approvals, or publish actions.

## Meta launch sequence

1. Call read-only onboarding and integration endpoints to confirm that Meta is connected in the HighLevel location.
2. Fetch the available ad accounts, pages, Instagram identities, lead forms, pixels, and maximum budget constraints.
3. Save only the selected provider IDs and safe display metadata in the campaign version.
4. Compile the approved blueprint to HighLevel's campaign, ad-set, ad, creative, targeting, and lead-form contract.
5. Create or update a draft through an allowlisted adapter.
6. Read the draft back and compare budget, dates, Special Ad Category values, page, form, geography, copy, and creative with the frozen approved version.
7. Ask the named approver to confirm the exact final launch summary.
8. Publish the campaign.
9. Poll publishing progress until it reaches a terminal state.
10. Record normalized provider IDs and results without storing raw credentials or unnecessary provider payloads.
11. Run a synthetic lead test and confirm HighLevel contact, opportunity, assignment, workflow, and notification behavior.

## Lead routing strategy

The first release should use the client's existing HighLevel automations instead of attempting to create workflows through the API.

Each tenant configures:

- Campaign tag
- Pipeline and stage
- Owner or assignment rule
- Calendar
- Optional existing workflow ID
- Contact field mappings

The app creates or updates the lead idempotently, applies the namespaced campaign tag, creates or updates the opportunity, and optionally adds the contact to the configured workflow. HighLevel remains responsible for SMS, email, voicemail, task, and appointment automation.

This keeps conversations and consent state in the client's CRM and avoids adding the broad messaging scope to the first installation.

## Public pages and funnels

HighLevel's public catalog exposes funnel and page reads plus redirect management, but it does not expose a general funnel-page creation contract comparable to the application's required multi-tenant page compiler. Therefore:

- Render campaign pages in Operation Automated LO.
- Use a tenant-owned subdomain or product domain.
- Send captured leads to the application backend, then write to HighLevel.
- Use HighLevel Custom Pages only for the authenticated product UI.
- Consider snapshots or manually installed workflow templates as a separate onboarding asset, not as the campaign-page runtime.

## Webhooks

Minimum subscriptions:

- App install
- App uninstall
- App update or plan change when billing is enabled
- Contact create or update only if required for attribution reconciliation
- Opportunity create, stage update, status update, monetary-value update, and delete
- Appointment create, update, and delete if appointment attribution is in the first dashboard

Webhook rules:

- Verify `X-GHL-Signature` using Ed25519 against the raw body.
- Do not implement the legacy `X-WH-Signature` verifier in this new application. HighLevel documents its deprecation for September 1, 2026, so the product starts on Ed25519.
- Store and reject duplicate webhook IDs.
- Return a successful acknowledgement quickly and process through a durable queue.
- Partition idempotency and ordering by location and resource.
- Reconcile critical state with periodic reads because webhooks are notifications, not the source of truth.

## Rate limits and resilience

HighLevel currently documents OAuth V2 limits per app and per location or company as 100 requests per 10 seconds and 200,000 requests per day.

The client must:

- Track the returned rate-limit headers.
- Use bounded concurrency by location.
- Retry `429` and transient `5xx` responses with exponential backoff and jitter.
- Never retry a write without an application idempotency record.
- Cache stable location, pipeline, calendar, and asset metadata with short TTLs.
- Use provider read-back after uncertain write results.

## Marketplace path

1. Create a HighLevel developer app and App Test account.
2. Configure sub-account target, both installers, bulk install, callback URLs, signed user context, webhooks, and required scopes.
3. Prove direct location install and agency bulk install.
4. Prove token refresh, uninstall, reinstall, scope upgrade, and app version upgrade.
5. Prove the complete Open House Boost path with test Meta assets and no real spend.
6. Run the founding cohort in Jonathan's agency or a very small agency set.
7. Complete privacy policy, terms, support, data deletion, security review, and Marketplace listing evidence.
8. Submit a public app or request HighLevel's private-app security review before crossing five agencies.
