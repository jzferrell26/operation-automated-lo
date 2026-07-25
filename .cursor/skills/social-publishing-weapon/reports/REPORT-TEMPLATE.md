# Publish run / audit report - <provider> - <YYYY-MM-DD>

The hand-off report shape for `social-publishing-guardian`. Use the PUSH RESULT shape for a publish run, the AUDIT shape for debugging an existing setup. No em dashes. Quote exact API errors verbatim.

---

## PUSH RESULT (a publish run)

**Provider:** <ghl | zernio | ...>
**Location / account:** <GHL locationId or provider account>
**Run mode:** <dry-run | live>   **Date:** <YYYY-MM-DD>

### What landed
| postKey | platforms | postId | read-back status | media | result |
|---|---|---|---|---|---|
| <key> | <facebook, linkedin> | <results.post._id> | draft | 1 | OK (verified) |
| <key> | <...> | <id> | draft | 0 | OK (verified) |

Every row's read-back status MUST be `draft`. A row that is not a verified draft is a finding below.

### Where the human takes over
<Exact place the operator reviews and publishes each draft, e.g. "GHL Social Planner -> Drafts for location <id>". State that NOTHING auto-publishes; the human promotes each draft.>

### Failures (if any)
| postKey | stage (create / read-back / publish) | exact API error | cause | fix |
|---|---|---|---|---|
| <key> | create | `422 ["media must be an array..."]` | media omitted | send media [] or [{url,type:"image"}] |

### Idempotency
Manifest: <path>. Re-run is safe (<N> entries recorded; resume skips completed keys).

---

## AUDIT (debugging an existing setup)

**Trigger:** <a post auto-published | a 422 | a token error | ...>

### Findings (severity-ranked)
| # | severity | finding | exact API error / evidence | fix | guide ref |
|---|---|---|---|---|---|
| 1 | critical | post created status:"scheduled" (auto-publishes) | <evidence> | recreate as draft; delete the scheduled post | guides/01-publish-gate.md |
| 2 | high | agency PIT on a location endpoint | 401 Token's user type mismatch! | use sub-account PIT | guides/02-auth-token-resolution.md |

### Open questions surfaced
<Carry any unresolved provider-semantics question as a TODO for the operator; do not invent an answer.>

---

### Sign-off
- [ ] Every post verified as a draft by read-back (not by the 201).
- [ ] No scheduled / published / active (GHL) or default/publish_now (Zernio MCP) anywhere.
- [ ] Token came from env; never logged or committed.
- [ ] Manifest written with real post ids; re-run safe.
- [ ] No em dashes in this report.
