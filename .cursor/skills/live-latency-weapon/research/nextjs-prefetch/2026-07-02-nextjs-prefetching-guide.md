---
source_url: https://nextjs.org/docs/app/guides/prefetching
retrieved_on: 2026-07-02
source_type: official-docs
authority: official
relevance: critical
topic: prefetch-storm
weapon: live-latency-weapon
---

# Next.js App Router Prefetching (official guide, v16.2.10, updated 2026-06-23)

## Summary
Full official Next.js guide on `<Link>` prefetching behavior. Confirms the mechanism behind the RSC prefetch storm in the cuantico-sms precedent: automatic viewport-triggered prefetch fires for every `<Link>` that scrolls into view, and each prefetch of a dynamic route with a `loading.js` file triggers a server round trip for the layout-to-loading-boundary portion. The guide documents `prefetch={false}` as the disable mechanism and a hover-triggered wrapper pattern as a middle ground. Directly informs Actions 3 and 7 of the Guardian's diagnostic sequence (storm capture and the prefetch=false fix-menu entry).

## Key quotations / statistics
- Prefetch/cache-TTL table by route type:
  | | Static page | Dynamic page |
  |---|---|---|
  | Prefetched | Yes, full route | No, unless `loading.js` |
  | Client Cache TTL | 5 min (default) | Off, unless enabled via `staleTimes` |
  | Server roundtrip on click | No | Yes, streamed after shell |
- "Automatic prefetching runs only in production. Disable with `prefetch={false}` or use the wrapper in Disabled Prefetch."
- Prefetch scheduling order: "1. Links in the viewport, 2. Links showing user intent (hover or touch), 3. Newer links replace older ones, 4. Links scrolled off-screen are discarded." -- explains why a long sidebar nav can fire a burst of prefetches on initial paint (many links enter the viewport simultaneously).
- Direct fix-menu citation: "You can disable prefetching by setting the `prefetch` prop of the `<Link>` component to `false`." with the caveat: "this means static routes will only be fetched on click, and dynamic routes will wait for the server to render before navigating."
- Hover-triggered middle-ground pattern given as full code: `prefetch={active ? null : false}` toggled via `onMouseEnter`, described as "To reduce resource usage without disabling prefetch entirely... targets only links the user is likely to visit."
- Troubleshooting section explicitly headed "Preventing too many prefetches," citing "rendering a large list of links (e.g. an infinite scroll table)" as the trigger case -- structurally identical to a sidebar nav with many `<Link>`s.

## Annotations for weapon-forge
- This is the primary, most load-bearing citation for the entire "RSC prefetch storm" finding class. The guide should reproduce the prefetch-scheduling order and the static-vs-dynamic table verbatim (cited) since it explains WHY a storm happens (viewport-triggered fan-out), not just how to fix it.
- Cross-reference: `2026-07-02-nextjs-app-router-navigation-lag-debugging.md` in this folder corroborates with a concrete "4x slower" data point and a dev.to case study; use both together.
- No contradiction with other sources.
