# Status, Feedback, and Attention

## Purpose

Make system, provider, compliance, approval, and workflow state immediately understandable without relying on color or vague language.

## Status taxonomy

| Meaning | Visual token | Required non-color cue |
|---|---|---|
| Healthy, ready, live, complete | Success | Dot or check plus label |
| Warning, pending, stale, expiring | Warning | Triangle, partial circle, or clock plus label |
| Blocked, failed, disconnected | Critical | X or alert icon plus label |
| Generated, publishing, selected | Info | Diamond or progress icon plus label |
| Draft, inactive, unavailable | Neutral | Open circle or explicit text |
| Provider result unknown | Uncertain | Distinct reconciliation icon plus label |

## Attention item contract

Every actionable attention item includes:

- What happened
- Affected module
- Severity or urgency
- Responsible party
- Next safe action
- Last attempt or freshness
- Stable exception code when applicable
- Correlation ID in secondary details

An attention item identifies the state with text and a distinct glyph as well as the semantic status token. It can represent `loading`, `empty`, `error`, `permission_restricted`, and `degraded` conditions without collapsing them into a generic alert.

Attention items must not expose credentials, raw webhook payloads, or unnecessary consumer data.

## Disabled action contract

A disabled consequential action always explains:

- Why it is disabled
- Which prerequisite is missing or stale
- Who can resolve it
- The next available safe action

Do not hide the reason only inside a tooltip.

## Provider uncertainty

`Uncertain, reconciling` is not a generic error. It means an external write did not produce conclusive evidence. The interface must:

- Prevent another provider write
- Show that read-back is running
- Show the last safe known state
- Provide a correlation ID
- Enable retry only after reconciliation reaches a terminal result

During reconciliation, retain the last safe known state, label the provider scope, and prevent a second write. Never call this state complete, successful, or retryable before read-back reaches a terminal result.

## Data feedback

- `Unavailable` means the system has no authoritative value.
- `Stale` means a prior authoritative value exists but freshness is outside policy.
- `Partial` means some required sources have not completed.
- Zero is displayed only when a source explicitly reports zero.

All data feedback shows source and freshness. Synthetic leads are visibly marked and excluded from business metrics and production routing. Permission-restricted views do not display cross-tenant or unauthorized placeholder data.

## Focus and motion

Focus uses the shared 2px ring with 3px offset and remains unobscured by sticky attention panels. Status changes announce material updates without stealing focus. Small status changes use `--motion-base`; reduced motion is immediate or opacity-only.

## Reference canvases

- `Overview.dc.html`
- `Onboarding.dc.html`
- `Preflight.dc.html`
- `Launch.dc.html`
- `CampaignDetail.dc.html`
- `Design System.dc.html`
