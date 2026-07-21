# Publication cleanup schedule

`reconcile-publication-cleanup` is a declarative Trigger.dev scheduled task. Its five-field cron
expression is `*/5 * * * *`, which fires every five minutes in UTC. Trigger.dev syncs this
schedule only to the `PRODUCTION` environment. UTC is intentional because cleanup is not tied to
human wall-clock time and must not change across daylight-saving transitions.

The production task deployment must provide
`OALO_PUBLICATION_CLEANUP_SCHEDULE_AUTHORITY_JSON` as server-only JSON with `locationRef`,
`locationId`, and `actorId`. `locationRef` must equal `OALO_GHL_READINESS_LOCATION_REF`.
`locationId` and `actorId` are the database tenant and active actor UUIDs for that same configured
single location. The scheduler rejects absent, malformed, or mismatched configuration. It never
stores an authority proof in configuration or in Trigger.dev. Each run derives a deterministic
delivery identity from trusted Trigger.dev schedule metadata and mints a fresh HMAC proof that
expires after five minutes.

This is deliberately a single-location production contract. Do not reuse one deployment to drain
multiple tenants. Multi-location operation requires an explicit per-tenant schedule registry or a
separately reviewed scheduler database authority design.

Trigger.dev limits this task to one concurrent run and expires queued runs after five minutes.
Postgres remains the correctness boundary: cleanup rows are claimed with `FOR UPDATE SKIP LOCKED`,
each claim has a two-minute lease owner, and completion or release must present that same lease
owner. R2 quarantine is idempotent. A retry or overlapping invocation can therefore claim other
available work, but it cannot complete or release another run's leased intent.

The task emits structured start, completion, and failure events with the schedule ID and scheduled
timestamp. Completion includes leased, completed, released, and dead-lettered counts. Production
operations must configure:

- a failed-run alert in Trigger.dev;
- a missed-run alert if no successful run is observed within ten minutes, one schedule period plus
  one schedule-period grace window;
- an alert whenever `deadLettered` is greater than zero;
- run-duration warning before 60 seconds and lease-age warning before two minutes.

The handler retries transient task-level failures up to three times with exponential randomized
backoff. Durable per-intent R2 failures are released through the existing persisted backoff and
dead-letter path instead of being hidden by task retries.
