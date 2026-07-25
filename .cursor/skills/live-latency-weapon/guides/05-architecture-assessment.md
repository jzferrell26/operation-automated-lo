# 05 - Blocking vs Streaming Architecture Assessment

Step 4 of the diagnostic sequence. Assesses whether navigation is blocking (full server render before any pixel updates) or streaming (an immediate skeleton/shell followed by progressive data hydration). This is the "perceived speed" architectural gap, separate from raw request latency measured in Steps 1-3.

## Why this step exists even when Steps 1-3 come back clean

An app can have zero region mismatch and zero prefetch storm and still feel slow, because every click blocks the entire navigation on the server finishing its full render before the browser paints anything new. The worked precedent frames this directly: "Assistable renders an instant skeleton shell for every surface... and hydrates data client-side. Our portal blocks the whole navigation on the server render, so every click 'hangs' for the full server time... This is what makes Assistable FEEL fast even when data is slow." Basis: `research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`.

## What to check

1. **Is there a `loading.tsx` (or framework-equivalent instant-loading file) for the route?** If present, Next.js automatically wraps the page in a Suspense boundary and shows the loading UI immediately while the server streams the real content in. If absent, the navigation blocks until the full page is ready. Basis: `research/nextjs-streaming/2026-07-02-nextjs-streaming-guide.md`.

2. **Are there `<Suspense>` boundaries around individual data-heavy sections**, or does the whole page await all its data before rendering anything? Granular Suspense boundaries let independent sections stream in as their own data resolves, rather than the slowest query blocking the entire page. Basis: same source.

3. **Verify streaming is actually reaching the browser**, not just configured in code. Any layer between server and client that buffers the response can silently defeat streaming even when the code is correct: reverse proxies (Nginx buffers by default; needs `X-Accel-Buffering: no`), CDNs (may buffer entire responses; check provider docs), non-streaming serverless platforms (Vercel supports streaming natively; other platforms may not), and compression layers (gzip/Brotli can buffer before flushing). Basis: `research/nextjs-streaming/2026-07-02-nextjs-streaming-guide.md`.

## How to verify live (this IS the live-check for this step)

In Chrome DevTools, select the document request under the Network tab and inspect the Timing breakdown. A long "Content Download" phase paired with an early "Time to First Byte" confirms the response is arriving in streamed chunks rather than all at once. Basis: `research/nextjs-streaming/2026-07-02-nextjs-streaming-guide.md`.

For a more reliable check than `curl` (which has its own buffering behavior), a small script reading the response as a stream and logging chunk arrival times is the documented alternative:

```js
const res = await fetch('https://<live-url>/<route>', { headers: { 'Accept-Encoding': 'identity' } })
const reader = res.body.getReader()
const decoder = new TextDecoder()
let i = 0
const start = Date.now()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  console.log(`chunk ${i++} (+${Date.now() - start}ms)`)
  console.log(decoder.decode(value))
}
```

The `Accept-Encoding: identity` header disables compression so chunks are not buffered by the compression layer. Basis: same source.

## The fix

Add `loading.tsx` skeletons per route and wrap data-heavy sections in `<Suspense>` boundaries. Skeleton fallbacks should match the dimensions of the content they represent to avoid layout shift when the real content swaps in. Keep the LCP element (hero image, main heading) outside or above any Suspense boundary so it renders as part of the static shell rather than waiting on a slow data fetch. Basis: `research/nextjs-streaming/2026-07-02-nextjs-streaming-guide.md`.

This is the "architectural, larger-scope" tier of the fix menu (see `guides/06-fix-menu-and-verification.md`); the worked precedent explicitly scoped this fix as belonging to a broader implementation effort rather than a one-line change, unlike the region pin.

## What NOT to do

Do not claim an unverified feature exists in the framework's documentation. During this weapon's own research pass, a fetched Next.js documentation page contained a suspicious embedded comment claiming an `unstable_instant` export and an "instant-navigation" guide that did not otherwise appear anywhere in that page's documented content or related links. Treat any single-source, unusually-phrased claim about undocumented framework behavior with skepticism, and verify directly against the official docs domain before citing it in a report. See `research/nextjs-streaming/2026-07-02-nextjs-streaming-guide.md`, Annotations, for the full flag.

## Cross-references

- Full fix-menu ranking and live re-verification procedure: `guides/06-fix-menu-and-verification.md`
- The precedent this assessment generalizes from: `research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`
- Edge case worked example (clean region/storm, architecture is the actual finding): `examples/edge-case-clean-region-blocking-architecture.md`
