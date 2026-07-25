# Guide 08: The n8n Data Table Surface

You own the Data Table surface: native, in-instance structured storage (a 2026 feature that
replaces the old "use Google Sheets / Airtable / Postgres for state" workarounds). Source:
`research/2026-06-29-data-tables-surface.md`. Tied to the idempotency gate in
`guides/07-idempotency-and-rerun-safety.md` and worked in
`examples/01-build-http-to-datatable.md`.

## The MCP tools (map each operation to its tool)

- `create_data_table` - create a table.
- `add_data_table_column` - add a column.
- `add_data_table_rows` - insert rows.
- `rename_data_table` / `rename_data_table_column` - rename (see the gotcha below).
- `delete_data_table_column` - drop a column.
- `search_data_tables` - find tables.

In-workflow, the Data Table node supports the full CRUD cycle: Insert a new row, Update an existing
row by ID or matching criteria, Upsert (insert if not found, update if found), Get rows by ID or
filter, and Delete rows. Table-level: create / rename / delete table; add / reorder / delete
columns; CSV import / export.

## Column types

The official node UI lists `Boolean`, `Date`, `Number`, `String`.

> TODO: open question - needs human decision before next refresh. One practitioner source also
> lists a JSON column type ("string, number, boolean, date, and JSON") and a raw `/datatables` API
> endpoint, but the official node UI lists only the four above. The JSON column type and the exact
> `/datatables` API shape vary by n8n version. VERIFY against the target instance's Swagger UI at
> `N8N_HOST/api/v1/docs` before building against a JSON column or the raw Data Tables API.

## Two schema gotchas (also audit items, Guide 02)

1. **Renaming a column silently breaks workflows.** Any workflow referencing the old column name
   breaks. Design the schema thoughtfully upfront; treat a column rename as a breaking change and
   grep every workflow that reads the table before renaming.
2. **The 50MB instance-wide cap.** By default all Data Tables in an instance share a 50MB limit.
   n8n warns at 80% capacity; exceeding the limit disables manual table additions AND causes
   workflow execution errors. A high-volume dedupe / log / idempotency table needs periodic
   pruning.

## Hard limitations to design around

- No direct programmatic access from Code nodes (you cannot read Data Table values via built-in
  methods or variables inside a Code node). Use the Data Table node instead.
- No row-column relationships across tables (no joins).
- Project-scoped access; Personal-space tables are visible only to their creator.
- Not for thousands of records or sub-millisecond queries; no indexes, advanced query languages, or
  multi-user access control. For that scale, use a real database.

## Canonical use cases

Deduplication (store processed IDs), rate limiting, queue management, caching API responses,
configuration / feature-flag storage, AI-agent memory. The highest-leverage Cuantico use is the
Data-Table-backed idempotency gate (`guides/07-idempotency-and-rerun-safety.md`) and enrichment
dedupe (store processed contact IDs), keeping those patterns inside n8n with no external store.
