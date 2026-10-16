# Workspace server retry plan

The signed-in live Campaigns navigation failed with support digest3712204668, matched to DB_ACQUISITION_TIMEOUT in deployment dpl_B6Rp5G1t59mXFC82r6MtvmHwWT7L. Its Try again action reset the client boundary without recovering. A full reload then returned the signed-in Campaigns list. Read-only database activity showed no waiting query or idle transaction in that snapshot. This establishes an intermittent acquisition failure, not its root cause or a resolved production incident.

Continue inline in the main-based completion branch. Scope the repair to the authenticated root error wrapper used by Campaigns: ask the existing Next router for a fresh server render, then reset the boundary inside a React transition. Preserve the shared ErrorState, support digest, wording and authentication checks. Other feature-specific boundaries remain unchanged. Do not add a POST, sign-out, automatic retry, pool configuration change, schema or provider action.

1. Add a regression at the actual wrapper seam that requires refresh before reset when Try again is clicked, no automatic attempt on render, and safe support details without raw database errors. Demonstrate RED on current source.
2. Implement the wrapper change; run its regression, shared boundary tests, web/tooling types and production build. Retain the observed production failure and clearly distinguish source recovery from an actual hosted retry check.
3. Run Security then Quality self-reviews and PR review; reconcile main and commit the bounded change after the existing CI checkpoint. A new exact-head canonical run is required before any shippable claim. No independent review is claimed and no local whole-app fixture startup is attempted.
