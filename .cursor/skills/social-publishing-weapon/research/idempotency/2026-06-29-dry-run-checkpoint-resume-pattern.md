---
source_url: https://oneuptime.com/blog/post/2026-02-09-job-checkpointing-long-running-batch/view
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: high
topic: dry-run-resume
weapon: social-publishing-weapon
---

# Dry-run + checkpoint/resume pattern for batch publishing (2026)

## Summary
Industry-current (2026) grounding for the arsenal's "dry-run -> push one -> verify -> push rest -> manifest -> --resume" push pattern. Combines dry-run-mode UX guidance with checkpoint/resume architecture. Gives weapon-forge the vocabulary and the design rationale to author a rigorous manifest+resume spec.

## Key quotations / statistics
- Dry-run value: "Preview how many documents will be processed, estimated token usage, and run time - no charges yet... valuable for high-stakes operations where validation before execution is critical." (Maps to: preview which posts will be pushed to which accounts before any create call.)
- Checkpoint pattern: "periodically saving progress, allowing jobs to resume from the last checkpoint rather than starting over... reduces operational costs by 60-80% in multi-step workflows."
- "Store progress regularly to persistent storage, resume from the last checkpoint on restart, and clean up checkpoints after successful completion."
- The "Dry Run button" is framed as UX that "saves your users money" by surfacing the plan before execution.

## Annotations for weapon-forge
- GROUNDS THE PUSH PATTERN: the arsenal's dry-run -> one-test -> verify -> rest -> manifest -> resume is a textbook checkpoint pattern. The manifest IS the checkpoint store. weapon-forge should:
  1. DRY-RUN: print the full plan (each post -> target accountIds, media URL, status=draft) and STOP. No create calls. This is the high-stakes preview.
  2. CHECKPOINT: after each successful create, write the real post id (GHL results.post._id / Zernio post id) to the manifest immediately (persist per-post, not at the end).
  3. RESUME: on re-run, read the manifest, skip every post whose key already has a recorded id. This makes re-runs no-ops for completed work (the cost-saving + double-post-prevention win).
  4. CLEANUP: optionally mark the manifest complete after the full batch verifies.
- COMBINE WITH the idempotency-key note: the manifest key should be a deterministic content+account hash so dry-run, first run, and resume all compute the same key for the same logical post.
- The 60-80% cost-reduction framing is the business justification for resume: a 50-account fan-out that fails at account 40 should resume at 41, not re-push 1-40 (which would also risk GHL's duplicate-content rejection).
- DRAFTS-ONLY x DRY-RUN: the dry-run plan must show status=draft for every post; if any planned post shows scheduled/published, the dry-run itself is the gate that catches it before a single create fires.
