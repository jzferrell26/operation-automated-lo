# Guide 01: Build a Workflow from Scratch (Workflow SDK)

Author a new workflow declaratively with the Workflow SDK and the instance-native MCP tools.
Source of every fact here: `research/2026-06-29-workflow-sdk-reference-in-environment.md` (the
verbatim SDK reference pulled from the live n8n MCP server) and
`research/2026-06-29-n8n-mcp-server-tools-and-validation.md`. Worked end to end in
`examples/01-build-http-to-datatable.md`.

## The build playbook (do not skip a step)

1. `search_nodes` to find the node types you need by keyword.
2. `get_node_types` (or `get_node` modes) to read the EXACT parameter names, including the
   resource / operation / mode discriminators. Do not guess parameter names (Directive 4).
3. Write the workflow code per the SDK reference (below). Pull the live reference yourself with
   `get_sdk_reference` if anything is unclear; it is the ground-truth contract.
4. `validate_workflow` and resolve every finding.
5. `create_workflow_from_code` to create it.
6. Bind credentials with `newCredential('Name')` in the code, then verify the binding after
   creation (Directive 1).
7. The new workflow is a DRAFT until you `publish_workflow` (Directive 2; see
   `guides/06-version-model-and-go-live.md`).

## SDK shape (verbatim from the in-environment reference)

Import from `@n8n/workflow-sdk`. Compose a linear chain with `.add(trigger).to(node).to(node)`
and export `workflow('id', 'name')`. Example skeleton:

```javascript
import { workflow, node, trigger, newCredential, expr } from '@n8n/workflow-sdk';

const startTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const fetchData = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch Data', parameters: { method: 'GET', url: 'https://api.example.com/x' } },
});

export default workflow('id', 'name').add(startTrigger).to(fetchData);
```

Control-flow factories available: `ifElse`, `switchCase`, `merge`, `splitInBatches`, `nextBatch`,
plus AI factories (`languageModel`, `memory`, `tool`, `outputParser`, `embeddings`, `vectorStore`,
`retriever`, `documentLoader`, `textSplitter`, `reranker`, `fromAi`).

## The five SDK footguns (each is also an audit checklist item, see Guide 02)

1. **Item multiplication.** When a node returns more than 1 item, chaining causes the next node to
   run N times instead of once. Fix with `executeOnce: true` (simplest) or parallel branches +
   `merge()`.
2. **`alwaysOutputData: true` is a footgun.** It forces a synthetic `{json: {}}` item downstream;
   downstream nodes then read fields that do not exist, HTTP requests hit `GET undefined`, and
   loops run once on a fake item. Only use it when the empty case has its own dedicated branch. Do
   NOT gate loops with an IF to check "are there items?" because `splitInBatches`, per-item nodes,
   and `filter` already no-op on empty input.
3. **0-based indices.** `.input(0)` is the FIRST input. When wiring N branches to a Merge node, the
   indices are `0, 1, ..., N-1`, never `1, 2, ..., N`.
4. **IF / Filter / Switch `conditions` shape.** Every IF/Filter `conditions` parameter MUST include
   `options`, `conditions`, and `combinator`. Switch rules use `rules.values` (NOT `rules.rules`);
   each rule needs `outputKey` and a complete `conditions` object.
5. **Expressions.** Use `expr()` for any `{{ }}` syntax, with single or double quotes, never
   backtick template literals. Variables MUST be inside `{{ }}`, never plain JS. Use
   `nodeJson(node, 'path')` instead of `$json` inside AI Agent subnodes, after fan-in
   (IF/Switch/Merge), or when reading further-upstream data.

## Control-flow primitive selection (verbatim)

- Per-item loop with side effects (fetch, embed, write) -> `splitInBatches` with `batchSize: 1`.
- Drop items that do not match a predicate -> `filter`.
- Two mutually exclusive paths that both do real work -> `IF` (`onTrue` / `onFalse`).
- Many mutually exclusive paths keyed off a value -> `switch` (`onCase`).

## Two non-negotiable per-node rules

- **Credentials:** only `newCredential('Name')` or an allow-listed existing ID. Never a hardcoded
  secret or invented ID (Directive 1 / Guide 00 standing rule).
- **Output sample:** every node MUST have an `output` property with sample data, because following
  nodes depend on it for expressions.

## Error wiring at build time

`.onError(handler)` connects a node's error output to a handler node and requires
`onError: 'continueErrorOutput'` in the node config. The three modes are `continueErrorOutput`
(route to error branch), `continueRegularOutput` (do not block other side effects), and the
implicit stop. Full treatment in `guides/04-error-handling-mechanics.md`.
