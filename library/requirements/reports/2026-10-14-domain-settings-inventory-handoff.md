# Settings directory inventory correction

Root owns this small test-only correction. Actual CI38544891984 at4209bbfe passed all current unit cases, then two legacy workspace-route integration assertions failed because they still required exactly three Settings cards and four links. The approved source adds the Domains directory entry before the original Account, Connections and lead-routing cards.

The correction retains the exact ordered heading assertion, complete sorted link inventory and Account billing-link assertion. It adds only Domains and /settings/domains to their expected collections and renames the descriptive test group. No application source, selector, route, guard, timeout, theme or customer workflow changed.

The same unchanged17-case integration file now passes. Formatting and diff checks pass. Current file SHA-256:3d9bbcfea6b5ca8d6f9be201206b8113086de5c4157b9abf2def281af372a6cc.

The actual authenticated Settings image changes receive separate whole-original UX review c3c386bc5ccd0807db5ad070d97281f6e179a4394c8162c48616636ce845a8e0. Root will adopt exactly those eight reviewed PNGs and preserve all previous originals. Its capture cases passed in38544884852 at4209bbfe; the overall run failed on a later webinar sign-in429. The separately assigned run-scoped legitimate-session fixture repair must complete fresh Security then Quality and actual CI before this branch is qualified.
