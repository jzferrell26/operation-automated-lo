# Homeowner reports

Governing design brief: sections 5, 7, 14, 15, 16 and 18. Product scope: PRD-007.

Add Homeowner reports to workspace navigation. The management page leads with tracked properties, fresh reports, monthly enrollment and explicit review requests. Use a property list with value/range, owner/contact, source date, enrollment and a clear report action. Keep internal configuration identifiers in settings/help, not prominent product copy.

Creation has three stages: property/contact, mortgage details, and report review. The mortgage stage distinguishes confirmed balances, amortization estimate, debt-free declaration and unknown debt. Extra liens have their own input and confirmation. Defaults never imply that balances or consent were verified.

The report has a branded header, prominent estimated value/range, equity breakdown, debt and source dates, property facts, comparable listing cards, input assumptions, scenarios and an explicit request-review action. No decorative metric may invent history or appreciation. History shows only stored snapshots. The report's printer stylesheet hides controls and forces a high-contrast paper layout.

The first-use path is an explicit sample property with fictional data; sample valuations cannot be relabeled as live. Live reports show configuration failures instead of substituting a sample. Sharing is available only for server-persisted reports; the sample can be viewed and printed on its current device.

Use the existing navy, cobalt, text/surface/status tokens and UI wrappers. Desktop report content uses a clear primary column with a subordinate assumptions panel; mobile stacks it. Shared report pages expose no workspace navigation or unrelated records.
