# Run Report: {{date}} - {{short_title}}

- **Date:** {{YYYY-MM-DD}}
- **Run type:** {{parse-webhook | validate | wire-tool | audit-tool | route | migration-step}}
- **GHL location / subaccount:** {{location_id}}
- **Current state:** {{live Assistable flow | cuantico-sms scaffold | mid-migration}}

## What was requested

{{the operator's ask, verbatim or paraphrased}}

## What was done

{{the action taken; link the guide(s) applied, e.g. guides/03 + guides/04}}

## Artifact produced

- {{tool-handler-spec | webhook-contract-note | migration-step-note}}: {{link or inline}}

## Contract checkpoints

- [ ] args read from `body.args`
- [ ] contact_id/location_id from `body.metadata` + header cross-check
- [ ] fail-loud guard on missing ids
- [ ] auth/signature verified before acting
- [ ] shape validated before execute
- [ ] TOOL_RESULT shape returned (if tool run)
- [ ] secrets env-only

## Routed to peer Guardians

- {{gohighlevel-guardian: ...}}
- {{n8n-workflow-guardian: ...}}
- {{typescript-node-guardian / supabase-platform-guardian / db-guardian / durable-workflows-guardian: ...}}

## Open items surfaced

- {{TODO: open question / TODO: re-fetch items raised this run}}

## Outcome

{{result; live flow unaffected? handler ported? bug fixed?}}
