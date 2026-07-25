# Live Latency Diagnosis: {{target_url}}

- **Date:** {{YYYY-MM-DD}}
- **Diagnosed by:** live-latency-guardian
- **Symptom reported:** {{one-line description of the "feels slow" complaint}}
- **Prior lab scores (if any):** {{Lighthouse/PageSpeed scores, or "not provided"}}

## Step 1: TTFB and header forensics

```
{{curl -o /dev/null -D - -s -w "..." output, or "not run" with reason}}
```

- Compute region observed: `{{region-code}}`
- Database region (if known): `{{region-code-or-unknown}}`
- Region mismatch: {{yes/no/inconclusive}}

## Step 2: Network storm capture

- Navigation tested: {{description}}
- Total requests fired: {{N}}
- Requests served from cache: {{N}}
- Storm detected: {{yes/no}}
- Any 5xx responses observed (self-DoS signal): {{yes/no -- if yes, ESCALATE per guides/00-principles.md Hard Rule 4}}

## Step 3: Round-trip counting

- Requests hitting origin with an auth check: {{N}}
- Requests additionally hitting the database: {{N}}
- Estimated round-trip cost: {{estimate, with basis}}

## Step 4: Architecture assessment

- `loading.tsx` / instant-loading file present: {{yes/no, per-route}}
- `<Suspense>` boundaries present around data-heavy sections: {{yes/no}}
- Streaming confirmed live (chunked response observed): {{yes/no/not-yet-verified}}
- Buffering layer suspected (proxy/CDN/compression): {{yes/no/unknown}}

## Fix menu (ranked by effort/impact)

| # | Fix | Effort tier | Expected impact | Verification method |
|---|---|---|---|---|
| 1 | {{fix}} | one-line config | {{impact}} | {{live re-check method}} |
| 2 | {{fix}} | small code change | {{impact}} | {{live re-check method}} |
| 3 | {{fix}} | architectural | {{impact}} | {{live re-check method}} |

## Live re-verification (post-deploy)

> Do not mark a fix "verified" until this section is filled in with a live re-check result, per guides/00-principles.md Hard Rule 3.

- {{Fix #1}}: {{live re-check result, e.g. "X-Vercel-Id now shows pdx1"}}
- {{Fix #2}}: {{live re-check result}}
- {{Fix #3}}: {{live re-check result}}

## Routing recommendations

{{Name any downstream Guardian a fix should route to, per guides/07-routing-boundaries.md. Leave blank if all fixes were small enough to hand directly to the operator.}}
