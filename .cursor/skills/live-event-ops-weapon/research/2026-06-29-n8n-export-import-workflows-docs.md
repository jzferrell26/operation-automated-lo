---
source_url: https://docs.n8n.io/build/manage-workflows/export-and-import/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: export-snapshot
weapon: live-event-ops-weapon
---

# n8n Docs: Export and import workflows

## Summary
The official n8n documentation for exporting/importing a workflow as JSON. This is the primary authority for the EXPORT-BEFORE-DEPLOY snapshot that is the rollback known-good in this Guardian's runbook. Confirms the UI Download/Import options and clarifies exactly what the export JSON contains regarding credentials (a correction worth flagging: the workflow JSON contains credential NAMES and IDs, not secret values).

## Key quotations / statistics
- UI workflow menu options (per https://docs.n8n.io/build/manage-workflows/export-and-import.md):
  - "Download" -> "exports the current workflow as a JSON file"
  - "Import from File" -> "imports a workflow from a local JSON file"
  - "Import from URL" -> "imports workflow JSON from a URL"
- On credentials in the export: the "exported workflow JSON includes credential names and ids" in the workflow JSON; the docs advise anonymizing/removing them before sharing. "HTTP Request nodes may contain authentication headers" when imported from cURL.
- For credential exports specifically: "secrets are only included when you use `n8n export:credentials ... --decrypted`."

## Annotations for weapon-forge
- This is the canonical source for the "export-before-deploy snapshot" pre-flight step. The snapshot is the workflow JSON; it captures node structure plus credential references (names/ids), NOT the secret values.
- IMPORTANT NUANCE for the rollback guide: because the export carries credential names/ids (references) but not secret values, restoring an export on the SAME instance with the SAME credentials intact reconnects automatically. Restoring onto a different instance (or after a credential was deleted/renamed) requires the matching credentials to exist by name/id. The Guardian's rollback is instance-local (restore onto the same n8n where the credential still lives), so this is the safe path -- but the guide should call out the cross-instance caveat explicitly.
- Pairs with the CLI commands source (export:workflow / import:workflow) for the exact-command form of taking and restoring the snapshot.
- Contradiction to resolve: some practitioner blogs say "credentials are not included in the export" -- that is true for SECRET VALUES but false for credential names/ids. weapon-forge should phrase the snapshot guide using the official wording.
