# Enrichment Workflow Design Spec - {{client_name}}

Fill this in BEFORE building or cloning. It captures the per-engagement inputs and the design decisions so the workflow is reproducible and auditable. Resolve every `{{placeholder}}`. Leave a `> TODO` line for any open question routed to another Guardian.

## Engagement inputs

- **Client / workflow name:** {{client_name}}
- **Contact source:** {{ghl_list | data_table | csv}} ({{approx_count}} contacts)
- **GHL location:** {{ghl_location_id}}
- **Cadence:** {{one_off | scheduled}} ({{schedule_detail_if_any}})
- **Clone of:** {{carolyn | grant | cuantico | none}}

## Providers and waterfall order

| Order | Provider | What it fills | Notes |
|---|---|---|---|
| 1 | {{provider_a}} | {{fields}} | highest ICP coverage |
| 2 | {{provider_b}} | {{fields}} | misses only |
| 3 | {{provider_c}} | {{fields}} | misses only |

- Provider count: {{n}} (target 3-4; cite diminishing returns if more).
- Stop rule: first confident hit wins; only misses pass downstream.
- Email verify gate: {{yes | no}} (recommended yes, before write-back).

## Target GHL custom fields

| Field label | fieldKey | Type | Format / option-value rule | Resolved by |
|---|---|---|---|---|
| {{label}} | {{fieldKey}} | {{DATE | SINGLE_OPTIONS | text}} | {{MM-DD-YYYY / exact option value / plain}} | gohighlevel-guardian |

> TODO: confirm fieldKeys and SINGLE_OPTIONS option values via gohighlevel-guardian.

## Batching and throttle

- **Stricter downstream limit:** {{provider | ghl}} at {{limit}}.
- **Batch Size:** {{start_value}} (start; tune down on 429).
- **Wait interval:** {{value}}.
- **429 remediation note:** on 429, increase Wait or reduce Batch Size.

## Normalize / merge

- **Match key:** {{ghl_contact_id | email | other}} (normalized lowercase + trim on BOTH branches).
- **Merge mode:** Combine -> Matching Fields -> Enrich Input 1.
- **Free-text-to-option mappings:** {{provider_value -> ghl_option_value, ...}}

## Idempotency / re-run safety

- **Idempotency key:** {{ghl_contact_id + data_table_gate}} (default; confirm per engagement).
- **Dedupe before enrich:** yes.
- **Conditional overwrite:** write only if blank OR higher `_confidence`.
- **Provenance fields:** `_source`, `_enriched_at`, `_confidence` ({{which target field types}}).

## Directives checklist (all must be yes)

- [ ] DATE formatted MM-DD-YYYY / DD-MMM-YYYY, no time, no `Z`.
- [ ] SINGLE_OPTIONS values are exact configured option values.
- [ ] Batched + throttled to the stricter limit.
- [ ] Dedupe + conditional overwrite in place.
- [ ] Provenance fields written.
- [ ] Credentials re-bound and verified after any MCP edit.
- [ ] No em dashes anywhere.
