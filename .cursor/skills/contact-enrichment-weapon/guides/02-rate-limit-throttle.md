# 02 - Rate-Limit Throttle (Loop + Wait)

Covers Command Brief CRITICAL DIRECTIVE 2. Grounded in `research/2026-06-29-n8n-rate-limits-wait-pattern.md` (official n8n docs) and corroborated by `research/2026-06-29-enrichment-cross-source-synthesis.md`.

## The canonical throttle pattern

The official n8n guidance is a manual, configurable throttle:

1. Add the **Loop Over Items (Split in Batches)** node BEFORE the node that calls your provider API.
2. After the provider call, add a **Wait** node set to "Resume -> After Time Interval".
3. Connect the Wait node back to the Loop node to form a throttled cycle.

This paces the run so each batch waits before the next provider/GHL call, instead of firing everything at once.

## Tuning the two knobs

There are exactly two knobs: Batch Size and Wait interval.

- Start Batch Size at a value sized to the provider (1 for strict single-item APIs, larger for tolerant ones; 200-500 for large GHL runs).
- When you hit a **429 (too many requests)**, the remediation is: increase the Wait time OR reduce the Batch Size. This is the operator-facing fix to document when a run gets throttled mid-list.
- Tune to the STRICTER of the two downstream limits (provider vs GHL), because a single run touches both.

## What n8n does NOT give you here

The official rate-limits section "does not provide explicit exponential backoff or retry logic." It is a manual throttle, not automatic rate-limit detection. So:

- Do NOT assume n8n will back off on its own.
- Pair this throttle with the per-node **Retry On Fail** / error-branch mechanics. Those are SDK-level and belong to **n8n-workflow-guardian**; hand off the retry/backoff wiring there per the Command Brief lane boundary.

## Design default to teach

When an operator does not specify limits, default the throttle to the stricter of the provider and GHL limits, and document the 429-driven tuning rule ("increase Wait or reduce Batch Size") in the workflow notes so the next operator can remediate without re-deriving it.

## Worked example

`examples/01-clone-carolyn-for-new-client.md` adds the Wait node after the provider call and notes the 429 remediation in the design spec.
