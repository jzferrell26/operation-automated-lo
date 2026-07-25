# live-latency-weapon

The arsenal for `live-latency-guardian`, the wall-clock perceived-performance diagnosis specialist for deployed web apps. See `ai-tools/command-briefs/live-latency-guardian-command-brief.md` for the full Command Brief and `research/research-summary.md` for the literature sweep this weapon was forged from.

This weapon encodes a fixed, ordered diagnostic sequence: curl TTFB and response-header forensics, browser network-storm capture, per-request auth/DB round-trip counting, and blocking-vs-streaming architecture assessment, always run against the LIVE deployment and re-verified live after any fix ships. It is generalized from a real hand-run diagnosis: the cuantico-sms portal versus its own "laggy and sluggish" complaint, 2026-07-02, documented in `research/internal/2026-07-02-cuantico-sms-assistable-parity-part1-perceived-performance.md`.
