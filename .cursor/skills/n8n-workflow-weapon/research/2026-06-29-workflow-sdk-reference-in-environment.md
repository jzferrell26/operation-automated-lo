---
source_url: in-environment n8n MCP tool `get_sdk_reference` (section=all)
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: workflow-sdk
weapon: n8n-workflow-weapon
---

# n8n Workflow SDK Reference (retrieved from the live n8n MCP server)

## Summary
This is the single most authoritative source for the SDK surface Cuantico actually uses: it was pulled directly from the n8n MCP server wired into this workspace via the `get_sdk_reference` tool (section `all`). It is the exact reference the Guardian must call BEFORE writing workflow code with `create_workflow_from_code`. It defines the builder API (`workflow()`, `trigger()`/`node()`, `.add()`/`.to()`, `expr()`, `newCredential()`), the control-flow primitives, the credential pattern, and a strict ruleset for item-count safety. The full verbatim reference (every pattern block, every rule) is reproduced below because the weapon-forge guides must derive node code from it, not from training-data memory.

## Key quotations / facts (verbatim)

Import statement:
```javascript
import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, switchCase, merge, splitInBatches, nextBatch, languageModel, memory, tool, outputParser, embedding, embeddings, vectorStore, retriever, documentLoader, textSplitter, reranker, fromAi, expr } from '@n8n/workflow-sdk';
```

Composition pattern (linear chain):
```javascript
const startTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const fetchData   = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { name: 'Fetch Data', parameters: { method: 'GET', url: '...' } } });
export default workflow('id', 'name').add(startTrigger).to(fetchData).to(processData);
```

Credential rule (verbatim, load-bearing):
> "Always use `newCredential()` for authentication ... NEVER use placeholder strings, fake API keys, or hardcoded auth values ... Never synthesize credential IDs. Do not invent raw IDs such as `WHATSAPP_CREDENTIAL_ID`, `mock-gmail-oauth2`, or any `mock-*` value ... If `availableCredentials` is provided, treat it as an allow-list: copy an existing credential ID exactly or use `newCredential('Name')` without an ID."
> Example: `credentials: { slackApi: newCredential('Slack Bot') }` — "The credential type must match what the node expects."

Item-multiplication footgun (verbatim):
> "When nodes return more than 1 item, chaining causes item multiplication: if Source A returns N items, a chained Source B runs N times instead of once." Fix with `executeOnce: true` (simplest) or parallel branches + `merge()`.

Zero-item / `alwaysOutputData` footgun (verbatim):
> "`alwaysOutputData: true` forces a synthetic `{json: {}}` item downstream. This is a footgun: downstream nodes will try to read fields that don't exist, HTTP requests will hit `GET undefined`, and loops will run once on a fake item." Only use it when the empty case has its own dedicated branch. Do NOT gate loops with an IF to check "are there items?" — `splitInBatches`, per-item nodes, and `filter` already no-op on empty input.

Control-flow primitive selection (verbatim):
> "Per-item loop with side effects (fetch, embed, write) -> `splitInBatches` with `batchSize: 1` ... Drop items that don't match a predicate -> `filter` ... Two mutually exclusive paths that both do real work -> `IF` (`onTrue`/`onFalse`) ... Many mutually exclusive paths keyed off a value -> `switch` (`onCase`)."

Index rule (verbatim):
> "Input and output indices are 0-based — `.input(0)` is the FIRST input ... When wiring N branches to a Merge node, the indices are `0, 1, ..., N-1` — never `1, 2, ..., N`."

Conditional `conditions` shape (verbatim): every IF/Filter `conditions` parameter MUST include `options`, `conditions`, and `combinator`. Switch rules use `rules.values` (NOT `rules.rules`); each rule needs `outputKey` and a complete `conditions` object.

Error-output wiring (verbatim):
> "`.onError(handler)` — connects a node's error output to a handler node. Requires `onError: 'continueErrorOutput'` in the node config." Example: `httpNode.onError(errorHandler)`.

Expression rules (verbatim): use `expr()` for any `{{ }}` syntax, always single/double quotes never backtick template literals. Variables MUST be inside `{{ }}`, never as plain JS. Available vars include `$json`, `$('NodeName').item.json`, `nodeJson(node, 'field.path')`, `$input.first()/all()/item`, `$now`, `$today`, `$itemIndex`, `$runIndex`, `$execution.id/.mode`, `$workflow.id/.name`. Use `nodeJson(node, 'path')` instead of `$json` in AI Agent subnodes, after fan-in (IF/Switch/Merge), or when reading further-upstream data.

Per-node output rule (verbatim):
> "Every node MUST have an `output` property with sample data — following nodes depend on it for expressions."

Sub-workflow / control-flow factories available: `ifElse`, `switchCase`, `merge`, `splitInBatches`, `nextBatch`, plus AI factories `languageModel`, `memory`, `tool`, `outputParser`, `embeddings`, `vectorStore`, `retriever`, `documentLoader`, `textSplitter`, `reranker`, and `fromAi`.

## Annotations for weapon-forge
- This is the PRIMARY source for the "build a workflow" guide. The build playbook is: `search_nodes` -> `get_node_types` (exact params, include resource/operation/mode discriminators) -> write code per THIS reference -> `validate_workflow` -> `create_workflow_from_code`. Do not let the builder guess node parameter names; the reference itself says guessing creates invalid workflows.
- The credential rule here is the SDK-side complement to the MCP-strip gotcha (see `2026-06-29-mcp-update-credentials-stripped.md`): the SDK never hardcodes a secret, only `newCredential('Name')` or an allow-listed existing id. weapon-forge should encode `newCredential` as the only sanctioned auth pattern in the build guide.
- The item-multiplication, zero-item/`alwaysOutputData`, 0-based-index, and IF/Switch `conditions`-shape rules are the highest-value "gotcha" content for an audit guide. Each maps directly to a node-by-node audit checklist item.
- Contradiction to resolve: the public-API tooling (n8n-mcp's `n8n_update_partial_workflow`) is diff/operations-based, whereas this SDK reference is whole-workflow declarative. weapon-forge should make the build guide use the SDK reference, and the edit guide reconcile diff-based vs whole-PUT (see REST/MCP source files).
