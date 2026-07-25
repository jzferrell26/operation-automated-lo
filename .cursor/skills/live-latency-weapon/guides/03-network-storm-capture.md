# 03 - Network Storm Capture

Step 2 of the diagnostic sequence. Captures browser network activity for the live app's key navigation flows and flags a request-storm pattern: many near-simultaneous requests fired by framework prefetch behavior rather than explicit user action.

## What counts as a "storm"

The canonical example is Next.js App Router's automatic viewport-triggered `<Link>` prefetching: every `<Link>` that scrolls into the viewport fires a prefetch request automatically, in production, with no user action required. A sidebar with many nav links (plus per-row links in a table or list) can fire well over a dozen prefetch requests on a single page load. Basis: `research/nextjs-prefetch/2026-07-02-nextjs-prefetching-guide.md`, which documents the exact prefetch-scheduling order ("1. Links in the viewport, 2. Links showing user intent, 3. Newer links replace older ones, 4. Links scrolled off-screen are discarded") that produces this fan-out.

The worked precedent found "15+ dynamic RSC prefetch requests" on a single portal page load from sidebar links plus per-row links, each one a full serverless render doing auth and queries (`research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`).

## How to capture

### With DevTools access

1. Open Chrome DevTools, Network tab, on the live URL (not localhost).
2. Clear the log, then load the page (or perform the navigation under test).
3. Sort the waterfall by Start Time to visually confirm a burst of near-simultaneous requests -- this is the storm signature. Green segments in each request bar show TTFB; blue shows content download. Basis: `research/browser-capture/2026-07-02-chrome-devtools-network-har-waterfall.md`.
4. Filter or search for the request pattern specific to the framework (for Next.js RSC prefetches, look for requests with an `?_rsc=` query parameter or an `RSC: 1` / `Next-Router-Prefetch: 1` request header).
5. Count the requests fired within the same short window (sub-second to a few seconds) as the navigation event.

### Without DevTools access (owner-assisted capture)

Per Hard Rule 6 in `guides/00-principles.md`, request the operator export a HAR file rather than skipping this step:

- In Chrome DevTools: right-click any request in the Network panel and select "Save all as HAR (sanitized)" -- the sanitized variant strips auth tokens/cookies before handoff, which is the safer default when the operator is capturing against a client's live production app. Basis: `research/browser-capture/2026-07-02-chrome-devtools-network-har-waterfall.md`.
- Alternatively, ask for plain screenshots of the Network tab waterfall for the navigation in question.

## Checking for the self-DoS failure mode

While counting requests, check whether any of them returned a `5xx` status, especially `503`. A storm severe enough can trip the app's own defensive systems -- for example, a fail-closed middleware timeout designed to protect against slow backends can itself time out under the burst load the storm creates. This is Hard Rule 4 in `guides/00-principles.md` and is a distinct, more urgent finding than ordinary "many requests" slowness. Basis: "Observed one prefetch 503ing: our own middleware fail-closed 5s timeout tripping under the self-inflicted burst" (`research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`).

## The fix

The primary fix is disabling automatic viewport prefetch on low-value links:

```tsx
<Link href={href} prefetch={false}>
  {children}
</Link>
```

On the App Router, `prefetch={false}` disables both viewport AND hover prefetching. If hover-triggered prefetch is still wanted (a middle ground that keeps some responsiveness benefit while cutting the viewport-triggered fan-out), use the wrapper pattern:

```tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'

export function HoverPrefetchLink({ href, children }) {
  const [active, setActive] = useState(false)
  return (
    <Link href={href} prefetch={active ? null : false} onMouseEnter={() => setActive(true)}>
      {children}
    </Link>
  )
}
```

`prefetch={null}` restores default static-route prefetching once user intent (hover) is shown. Basis: `research/nextjs-prefetch/2026-07-02-nextjs-prefetching-guide.md`.

Recommend keeping prefetch enabled only on high-value targets (the links most likely to be clicked next), and disabling it on long lists, footers, or low-traffic nav items. The worked precedent's fix was exactly this: `prefetch={false}` on portal/dashboard sidebar links (`research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`).

## What this fix does NOT solve

Disabling prefetch reduces request COUNT but does not fix a blocking-navigation feel if the eventual real navigation still blocks on a full server render with no streaming shell. Storm mitigation and architecture assessment (`guides/05-architecture-assessment.md`) are complementary fixes, not substitutes for each other. Basis: `research/nextjs-prefetch/2026-07-02-nextjs-app-router-navigation-lag-debugging.md`.

## Cross-references

- Round-trip counting for each flagged storm request: `guides/04-round-trip-counting.md`
- Owner-assisted capture and PII handling: `guides/00-principles.md` (Hard Rule 6)
- Worked example: `examples/happy-path-region-and-prefetch-storm.md`
