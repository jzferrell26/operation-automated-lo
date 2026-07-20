# PRD 001h: Self-Onboarding and Launch Readiness

## Goal

Let an authorized HighLevel customer install Operation Automated LO, grant the correct permissions, complete every required configuration, verify the complete lead path, and reach Launch Ready without required Cuantico intervention.

## User stories

- As a location administrator, I can see exactly which permissions and configuration steps are required so I can complete setup without a support call.
- As an agency administrator, I can bulk install the app while preserving each location administrator's responsibility for local configuration and attestations.
- As a loan officer, I can leave setup and resume on another device without repeating completed steps.
- As a compliance owner, I can distinguish customer attestations from technical checks and see who completed each action.
- As a support operator, I can diagnose a blocked setup from a correlation ID without accessing secrets or unnecessary consumer data.

## Scope

- Direct sub-account and agency bulk-install entry paths
- Installer-authority and granted-scope preflight
- Application role assignment
- Resumable onboarding state and progress
- Brand, compliance, partner, routing, and Meta readiness
- Synthetic lead-path test
- Launch Ready certification and continuing health checks
- Contextual help, stable onboarding anchors, and safe diagnostics
- Onboarding funnel and time-to-readiness events

## Definitions

### Self-onboarding

The customer completes setup through product UI and connected HighLevel surfaces. Help articles, videos, optional office hours, and support escalation are permitted. Required operator data entry, hidden provisioning, or a mandatory setup call is not self-onboarding.

### Full setup

The location has valid permissions, profiles, routing, Meta connections, roles, and a passing synthetic lead path. Full setup does not require a live ad campaign or real consumer lead.

### Launch Ready

The server has current evidence that every required full-setup condition passes. Launch Ready is revoked to `attention_required` when a required token, mapping, asset, policy, or connection becomes invalid.

## Permission model

### HighLevel installation authority

- Direct install requires a HighLevel user who can install Marketplace applications for the active location.
- Agency bulk install requires appropriate agency authority and the Profile B server path.
- Every bulk-installed location requires an authorized local administrator to confirm its own profiles, mappings, Meta assets, and roles.
- Signed HighLevel user context is the source of company, location, user, and HighLevel role.
- Client-supplied company, location, user, role, or granted-scope values are never trusted.

### OAuth capability groups

| Capability | Requirement |
| --- | --- |
| Core workspace | Profile A permissions required for the active configuration and lead path. Missing required core access blocks setup. |
| Agency bulk install | Profile B permissions only for agency-managed installation and location-token exchange. |
| Ads Publisher | Profile C permission only when Meta publishing is activated, with the existing destructive-operation denylist and explicit broad-scope disclosure. |

The application displays permission purpose, current status, business impact, and reconnect action. A granted OAuth scope never bypasses application role or command-gate authorization.

### Application roles

| Role | Setup authority |
| --- | --- |
| `location_admin` | Configure the location, confirm mappings, and assign customer roles. |
| `campaign_creator` | Create drafts after setup; cannot change installation or token state. |
| `campaign_approver` | Approve frozen campaign versions when tenant policy permits. |
| `campaign_publisher` | Publish, pause, and resume after command gates pass. |
| `viewer` | Read dashboards and history. |
| `platform_support` | No self-assignment; audited and time-limited only. |

The installer receives `location_admin` only when signed HighLevel context confirms sufficient authority. A small team may assign several business roles to one person, but the final summary shows the concentration of duties.

## Onboarding experience

### Checklist 1: Get Connected

Limit the visible checklist to five outcome-based items:

1. **Install and permissions:** verify installation, signed context, granted scopes, token health, and administrator authority.
2. **Brand and compliance:** complete required loan officer, lender, license, disclosure, consent, and approved-asset values.
3. **GHL routing:** select and verify owner or assignment rule, pipeline, stage, calendar, namespaced tag, field mappings, and optional workflow.
4. **Meta connection:** verify HighLevel's Meta integration and select the accessible ad account, page, Instagram identity, form, and pixel required by the blueprint.
5. **Team responsibilities:** assign creator, approver, publisher, and viewer roles and confirm any required separation of duties.

### Checklist 2: Launch Readiness

This checklist unlocks after Get Connected:

1. **Dependency recheck:** revalidate all tokens, scopes, profiles, mappings, roles, and provider assets.
2. **Synthetic lead:** submit a clearly labeled test and verify contact, tag, opportunity, owner, workflow, and notification behavior.
3. **Results review:** show each created GHL object, excluded test metrics, warnings, and any authorized exception.
4. **Launch Ready:** issue the ready state with timestamp, verifier version, evidence summary, and next action to create Open House Boost.

The checklist is persistent but dismissible. Dismissing guidance never marks work complete. Completion is driven by provider reads, validated saved configuration, and successful tests.

## State and persistence

- Onboarding state is location-scoped and stored server-side so progress follows the authenticated user across devices.
- Each step has `not_started`, `in_progress`, `blocked`, `complete`, or `stale` status.
- Every completion record includes verifier version, verified time, safe evidence summary, and relevant provider IDs.
- Optional fields can be skipped only when the active blueprint and tenant policy mark them optional.
- Any dependency change reruns affected verifiers and can move a completed step to `stale`.
- A location has one current readiness result and append-only readiness history.
- Retrying a step is idempotent and cannot duplicate provider or product objects.

## Guidance and recovery

- Every blocked state has a stable code, plain-language explanation, responsible party, exact remediation, retry action, and correlation ID.
- Contextual guidance targets stable `data-tour` anchors, never CSS classes or visible text when the product controls the element.
- Guided tours are behavior-triggered, role-aware, versioned, dismissible, and controlled by a release flag.
- A selector registry and automated smoke test protect onboarding guidance from UI drift.
- Help content distinguishes customer action, lender or compliance action, HighLevel action, Meta action, and Cuantico support action.
- Support diagnostics exclude access tokens, refresh tokens, secrets, raw webhook bodies, and unnecessary lead data.

## Acceptance criteria

### Complete without operator intervention

- A prepared direct-install location administrator can reach Launch Ready within 30 minutes without Cuantico changing the customer's HighLevel configuration.
- An agency-installed location can complete local setup without an agency or Cuantico operator impersonating the location administrator.
- Setup works in the embedded HighLevel Custom Page and the authenticated first-party fallback.
- Leaving, reloading, changing theme, or switching between supported devices does not lose verified progress.

### Permissions

- The app verifies installer authority from signed context before granting `location_admin`.
- The permission screen shows required, granted, missing, and optional capabilities by business purpose.
- Missing required core permission blocks Launch Ready and supplies a reconnect path.
- Read-only ad access cannot satisfy Ads Publisher readiness.
- Platform support, approval, and publication authority cannot be self-elevated through onboarding requests.

### Configuration

- Required profile fields adapt to the active blueprint, lender policy, location, state, and channel.
- Every selected GHL object and Meta asset is read back from the active location before its step completes.
- Existing valid objects are reused when safe; namespaced objects are created idempotently only where the product contract permits creation.
- The app does not create customer workflows, rewrite DND state, import a database, or connect Meta credentials directly.

### Synthetic test and readiness

- The synthetic lead is visibly labeled and excluded from production campaign metrics.
- The test verifies contact, tag, opportunity, owner, optional workflow, and notification behavior.
- A partial or uncertain provider result is reconciled before retry.
- Launch Ready includes current evidence for every required permission and configuration dependency.
- A revoked scope, expired token, deleted mapping, disconnected Meta asset, or invalidated policy moves the location to `attention_required` and blocks affected commands.

### Usability and operations

- The visible checklist contains no more than five items per phase.
- Checklist items open the exact product surface needed to complete the action.
- Progress is based on observed completion and cannot be forged by a browser-only flag.
- The user can dismiss optional guidance without losing the persistent setup checklist.
- Keyboard, screen-reader, focus, contrast, loading, empty, error, and retry states work in Light and Dark modes.
- Onboarding emits viewed, started, item-completed, blocked, resumed, dismissed-guidance, Launch Ready, and attention-required events without PII payloads.

## Non-goals

- Mandatory concierge onboarding
- Custom funnel, automation, workflow, or campaign building during setup
- Database cleanup, migration, or reactivation
- Direct Meta OAuth or storage of Meta credentials
- Automated legal or lender approval
- Arbitrary custom roles beyond the defined application roles
- Live ad spend or a real consumer lead as a setup requirement
- Onboarding email-sequence implementation in this PRD

## Verification

- Test direct location install, agency bulk install, reinstall, scope upgrade, missing scope, declined scope, expired token, and reconnect.
- Test authorized and unauthorized installer roles and every application-role assignment boundary.
- Test resume from every step on a second device and after session expiration.
- Test stale GHL mappings, disconnected Meta assets, missing policy fields, and remediation recovery.
- Test duplicate clicks, network timeout, provider `429`, partial provider success, and repeated synthetic lead attempts for idempotency.
- Test synthetic lead contact collision, DND state, workflow failure, notification failure, and cleanup or exclusion from metrics.
- Test embedded and first-party flows in Light, Dark, and System themes.
- Test every registered `data-tour` selector in CI.
- Run a founding-cohort setup exercise with no operator configuration and record time to Launch Ready, blocker rate, abandonment, and support minutes.

## Open questions

- [ ] Will HighLevel approve a paired core and Ads Publisher application, or must the broad write permission be disclosed during one install?
- [ ] Which exact HighLevel roles can initiate direct install and agency bulk install in every supported account state?
- [ ] Which optional GHL custom fields, if any, are necessary for the first synthetic lead contract?
- [ ] Does the founding release persist checklist progress in the primary product database or a dedicated onboarding-event table?
- [ ] Which notification channel is mandatory for the synthetic test when a customer has no eligible workflow?
