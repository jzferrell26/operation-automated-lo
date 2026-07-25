---
source_url: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: webhook-verification
weapon: live-event-ops-weapon
---

# n8n Docs: Webhook node (test URL vs production URL)

## Summary
Official n8n webhook-node documentation. This is the authority for the post-deploy verification loop and the trigger-reachability pre-flight check. The test-URL-vs-production-URL distinction is the single most important fact for "fire a controlled test" without faking a production go-live, and it is a known live-event trap (testing the wrong URL).

## Key quotations / statistics
- Test webhook URL: "Used while building/testing"; "Works when you enable Listen for test event"; "The test webhook stays active for 120 seconds"; "Incoming data shows in the editor UI for debugging". Registered when you initiate a test execution.
- Production webhook URL: "Used after you're ready to run in real integrations"; "n8n registers it when you save and publish the workflow"; "The production webhook stays active until you unpublish"; requires the workflow to be published to function; "Incoming payloads don't show in the editor UI; check Executions instead".
- Verification steps (from the same doc): ensure the workflow is published; send an HTTP request to the production URL matching your configured method; navigate to the workflow's Executions tab; verify the execution appears with expected output.

## Annotations for weapon-forge
- This drives BOTH the pre-flight "trigger reachable" check and the post-deploy "fire a controlled test" loop.
- KEY DISCIPLINE for the verification guide: a production webhook fires the LIVE workflow and shows NOTHING in the editor UI -- you MUST confirm via the Executions tab, not the canvas. The verification guide should make "check Executions, not the editor" an explicit step.
- The 120-second test-listener window is a footgun for live-event pressure: if the operator is verifying via the test URL, the listener auto-closes after ~120s and the test silently stops working. weapon-forge should tell the operator which URL they are using and why -- for a real go-live verification, the workflow must be published and the PRODUCTION URL exercised.
- The "controlled test" the brief calls for should be a deliberately benign payload to the production webhook (or a dedicated test-intake path) that the operator can later identify and clean up -- pair this with the Intake-workflow prior art (slot field keys, lead-import tagging) so the test record is recognizable.
- Pairs with the executions doc for the "confirm the execution succeeded and produced the expected records/tags/notifications" half of the loop.
