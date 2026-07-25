---
source_url: https://developer.chrome.com/docs/devtools/network/reference
retrieved_on: 2026-07-02
source_type: official-docs
authority: official
relevance: high
topic: network-capture
weapon: live-latency-weapon
---

# Chrome DevTools Network tab: HAR export and waterfall analysis (search-aggregated finding)

## Summary
WebSearch-aggregated finding (Firecrawl/Exa unavailable) covering Chrome's official DevTools network reference plus corroborating practitioner explainers (DebugBear, OpenReplay) on capturing and reading browser network activity. This is the primary tooling citation for Action 3 (browser network capture for request-storm detection) and the owner-assisted-capture fallback referenced in Critical Directive 6.

## Key quotations / statistics
- HAR export mechanism: "You can export HAR files by clicking the Export HAR button in the action bar at the top of the Network panel... You can also right-click any request and select 'Save all [listed] as HAR (sanitized)' or 'Save all [listed] as HAR (with sensitive data)'."
- HAR format definition: "HAR (HTTP Archive) is a file format used by several HTTP session tools to export the captured data." HAR exports "capture entire network sessions for analysis in specialized tools like WebPageTest or sharing with team members" -- this is the exact artifact an operator without live DevTools access could hand to the Guardian for owner-assisted capture.
- Waterfall chart semantics: "The waterfall chart in Chrome DevTools Network panel tells a story about every millisecond of your page load, where each horizontal bar represents a request's journey from initiation to completion. Green segments show waiting time (TTFB), while blue represents content download time."
- Sorting options relevant to storm detection: "You can change how the Waterfall sorts requests by options including Start Time, Response Time, End Time, Total Duration, and Latency." Sorting by Start Time is the direct way to visually confirm a burst of near-simultaneous requests (the storm signature).

## Annotations for weapon-forge
- This is the tooling citation for the Guardian's browser-capture step and the "sanitized" HAR export option is specifically relevant to Critical Directive on PII/security: a "Save all as HAR (sanitized)" export strips auth tokens/cookies before handoff, which the Weapon's owner-assisted-capture guide should recommend by default over the "with sensitive data" variant, especially since this Guardian may receive HAR files from an operator working on a client's live production app.
- Open item carried from the Command Brief IDEAS section: whether to standardize on a specific automated browser-capture tool (Chrome DevTools Protocol via an MCP) vs manual DevTools + HAR export remains unresolved by this research pass; the Weapon should document the manual DevTools/HAR path as the baseline (works everywhere, no tooling dependency) and note automated capture (e.g. `mcp__Claude_in_Chrome__read_network_requests` if available in the operator's environment) as an optional accelerant.
