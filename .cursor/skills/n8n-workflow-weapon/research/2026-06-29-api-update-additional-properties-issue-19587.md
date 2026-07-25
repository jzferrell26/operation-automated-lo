---
source_url: https://github.com/n8n-io/n8n/issues/19587
retrieved_on: 2026-06-29
source_type: github-readme
authority: official
relevance: high
topic: rest-api-put
weapon: n8n-workflow-weapon
---

# Issue #19587: update_partial_workflow fails with "additional properties not allowed"

## Summary
Official n8n-io/n8n issue documenting that the MCP `n8n_update_partial_workflow` function fails even on a trivial name change, because the request carries extra properties (notably inside the `settings` sub-object) that the public REST API rejects under strict schema validation. The issue was closed as "not planned" and the function is labeled DEPRECATED, with a Clone-and-Create workaround recommended.

## Key quotations / statistics (verbatim)

Exact error (note: this one points at the nested `settings` object):
> "request/body/settings must NOT have additional properties"

Minimal reproducing case (verbatim):
```js
await n8n_update_partial_workflow({
  id: "QwMIWnIv0G1CHMS6",
  operations: [{ type: "updateName", name: "Test_Updated_Name" }]
});
```

Root cause (verbatim): "the MCP server appears to send extra properties in the `settings` object that the n8n REST API doesn't accept" — suspected debug props, MCP metadata, validation flags, or default values.

Key tell (verbatim): "validation-only requests succeed, but actual update requests fail, suggesting a request formatting problem rather than authentication issues."

Workaround (verbatim): a "Clone-and-Create" method — "retrieve the workflow, apply modifications locally in JavaScript, then create a new workflow with the updated properties."

Maintainer status (verbatim): labeled "DEPRECATED" and closed as "not planned."

## Annotations for weapon-forge
- This is the strongest evidence that the SAFEST edit path is not always a partial/diff update through the MCP, but a controlled whole-object operation: either a clean REST PUT with only the four allowed keys and a sanitized `settings`, or Clone-and-Create.
- Critical nuance for the edit guide: strict validation applies to the NESTED `settings` object too, not just the top level. The audit/edit checklist must strip unknown `settings` keys (keep only the documented `saveExecutionProgress`, `saveManualExecutions`, `saveDataErrorExecution`, `saveDataSuccessExecution`, `executionTimeout`, `timezone`, `errorWorkflow`, and `executionOrder` where the instance accepts it).
- Reinforces Critical Directive #3. weapon-forge should present a "sanitize before PUT" code template that whitelists keys at BOTH levels.
