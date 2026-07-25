# Example 01: Build an HTTP-to-Data-Table Workflow (happy path)

Demonstrates `guides/01-build-workflow-sdk.md` and `guides/08-data-tables.md`. Shows the full
build playbook, the `newCredential()` rule, and writing fetched data into a Data Table.

## Input the Guardian receives

> "On the voyze instance, build a workflow that hits the CRM API every hour, pulls new contacts,
> and writes their IDs into a Data Table so we can dedupe later. It uses the existing CRM API
> credential."

## What the Guardian does

1. Confirm instance: voyze.ai n8n (Directive 5).
2. `search_nodes` for "schedule trigger", "http request", "data table".
3. `get_node_types` for each, reading exact parameter names (method, url, table operation). Do not
   guess (Directive 4).
4. Ensure the Data Table exists: `create_data_table` (name `processed_contacts`), then
   `add_data_table_column` for `contact_id` (String). Column types per Guide 08.
5. Write the SDK code:

```javascript
import { workflow, node, trigger, newCredential } from '@n8n/workflow-sdk';

const everyHour = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.2,
  config: { name: 'Every Hour', parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } } },
});

const fetchContacts = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Fetch New Contacts',
    parameters: { method: 'GET', url: 'https://crm.example.com/api/contacts?since={{ $now.minus({ hours: 1 }) }}' },
    credentials: { httpHeaderAuth: newCredential('CRM API') },
    retryOnFail: true, maxTries: 3, waitBetweenTries: 2000,
  },
});

const writeIds = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1,
  config: {
    name: 'Record Contact IDs',
    parameters: { operation: 'upsert', tableId: 'processed_contacts', matchColumn: 'contact_id' },
  },
});

export default workflow('voyze-contact-pull', 'Hourly Contact Pull').add(everyHour).to(fetchContacts).to(writeIds);
```

6. `validate_workflow` and resolve findings.
7. `create_workflow_from_code`.
8. Verify the `CRM API` credential bound (UI or test run), per Directive 1.
9. The workflow is a DRAFT. `publish_workflow` to go live, then re-GET to confirm it is active
   (Directive 2, Guide 06).

## Output the Guardian produces

A change report (per `templates/change-report.md`) noting: instance = voyze, new workflow
`Hourly Contact Pull`, credential `CRM API` verified bound, validated, published and confirmed
active. Notes the explicit retry settings (`maxTries: 3`, `waitBetweenTries: 2000`) set rather
than left to a default (Guide 04).

## Why this is the happy path

Every directive is satisfied: real `newCredential()` (no hardcoded secret), validate-before-create,
explicit publish + confirm, verified binding. Contrast with the unsafe edit in `examples/03`.
