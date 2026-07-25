---
source_url: https://docs.n8n.io/data/data-tables/ + https://ryanandmattdatascience.com/n8n-data-tables/ + https://github.com/kronosalpha2026/N8N-Documentation/blob/main/docs/data/data-tables.md
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: data-tables
weapon: n8n-workflow-weapon
---

# n8n Data Tables: native table storage (operations, types, limits)

## Summary
The Data Table surface the Guardian owns (Command Brief: Data Tables IN SCOPE). Data Tables are native, in-instance structured storage introduced as a major 2026 update (practitioner source dated 2026-03-28), replacing the old "use Google Sheets / Airtable / Postgres for state" workarounds. Covers column types, CRUD operations, the `/datatables` API endpoint, the 50MB instance limit, and the hard limitations.

## Key quotations / statistics (verbatim)

Column data types (verbatim): "Boolean, Date, Number, or String" (the official node UI). One practitioner source also lists JSON as a fifth type ("string, number, boolean, date, and JSON") — treat JSON as version-dependent and verify per instance.

Operations via the Data Table node (verbatim): "Insert a new row, Update an existing row by ID or matching criteria, Upsert (insert if not found, update if found), Get specific rows by ID or filter, and Delete rows. These operations cover the full CRUD cycle." Table-level: create table, rename table, delete table; add/reorder/delete columns; CSV import/export.

API access (verbatim): "You can work with data tables programmatically using the `/datatables` endpoint in the n8n API."

Storage limit (verbatim): "By default, the total storage used by all data tables in an instance is limited to 50MB." Warning at 80% capacity; exceeding the limit "disables manual table additions and causes workflow execution errors."

Hard limitations (verbatim):
> "No direct programmatic access from Code nodes" / "Cannot access data table values via built-in methods or variables from Code nodes."
> "No support for row-column relationships across tables."
> Project-scoped access; Personal-space tables are accessible only to their creator.
> Not suitable for "thousands of records or requiring sub-millisecond query times" — no "complex joins, indexes ..., advanced query languages, or multi-user access control."

Schema-change gotcha (verbatim): "column renaming breaks workflows" — design schema thoughtfully upfront; periodically clean up accumulating rows.

Use cases (verbatim): deduplication (store processed IDs), rate limiting, queue management, caching API responses, configuration/feature-flag storage, AI-agent memory.

## Annotations for weapon-forge
- This is the source for the Data Tables guide. The in-environment MCP exposes the matching tools: `create_data_table`, `add_data_table_column`, `add_data_table_rows`, `rename_data_table`, `rename_data_table_column`, `delete_data_table_column`, `search_data_tables`. Map each guide step to the exact tool.
- Highest-leverage cross-link: Data Tables are the Cuantico-native backing store for the idempotency gate (Upsert on an idempotency key) AND for enrichment dedupe (store processed contact IDs). weapon-forge should connect the Data Tables guide to the idempotency guide.
- Capture the two schema gotchas as audit items: (1) renaming a column silently breaks any workflow referencing it; (2) the 50MB instance-wide cap means a high-volume dedupe/log table needs periodic pruning or it will start failing executions.
- Flag for the operator: the JSON column type and the exact `/datatables` API shape vary by n8n version; verify against the target instance's Swagger UI (`.../api/v1/docs`) before building against them.
