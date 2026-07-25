# n8n Workflow Change Report

> Fill every `{{placeholder}}`. Delete this quote block before delivering. No em dashes anywhere.

- **Instance:** {{cuantico-main | voyze.ai}}
- **Workflow:** {{name}} (`{{workflow_id}}` or "new")
- **Change type:** {{build | edit}}
- **Surface used:** {{Workflow SDK | REST PUT | MCP update_workflow}} ({{one-line why}})
- **Changed by:** n8n-workflow-guardian
- **Date:** {{YYYY-MM-DD}}

## What changed

{{plain-language description of the build or edit, node by node where useful}}

## Safety checklist (every box must be true before "done")

- [ ] Confirmed instance and live state before editing (Directive 5).
- [ ] Workflow JSON exported before edit as rollback (Directive 5 / Guide 03).
- [ ] `validate_workflow` run and findings resolved (Directive 4).
- [ ] REST PUT body restricted to `name` / `nodes` / `connections` / `settings`; `staticData`
      omitted unless verified per instance (Directive 3).
- [ ] Credentials re-bound and VERIFIED via UI or test execution (Directive 1).
- [ ] Published / activated, and re-GET confirmed the new `versionId` is live (Directive 2).
- [ ] No em dashes in this report (Directive 6).

## Errors hit and how resolved

{{e.g. "400 additional properties on first PUT -> stripped read-only keys and retried" or "none"}}

## Policy left to the client (out of scope)

{{e.g. error severity routing / who-gets-paged, or "none"}}

## Rollback

{{location of the exported pre-edit JSON}}
