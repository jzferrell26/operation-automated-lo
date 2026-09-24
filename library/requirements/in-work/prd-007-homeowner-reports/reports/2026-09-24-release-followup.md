# AVM release follow-up

The complete main-targeting CI run on `278c242` reproduced the inherited campaign screen failures. This follow-up qualifies the dashboard foundation included by the AVM branch.

## Functional corrections

The legacy campaign builder now retains its established `Running the checks` label while a request is pending. The newer dashboard preview keeps its `Checking your campaign…` label. Both paths use the same disabled submit control and actual in-flight request. This fixes the non-preview saving-state test without weakening its assertion.

The campaign builder's inline result no longer moves focus while the guided walkthrough is open. Previously the inline result and step 5 both focused their headings in the same render, and the inline result could override the active walkthrough. When the walkthrough is closed the result still receives focus. The existing guided-setup integration journey now asserts that step 5 owns focus after the campaign is saved and the destination navigation is requested; all 39 tests in that file pass.

## Baseline review

Baseline change: refreshed the eight `campaign-detail--default--{1440,1180,768,390}--{light,dark}.png` references from the Ubuntu 24.04 Chromium captures in Actions run `35948333014`, `verify-failure-traces`. All eight actual/reference comparisons were inspected before accepting them. The intended differences are the existing semantic info color on the sample-data notice and the launch-summary helper spacing, including four additional pixels in document height. Property data, approval state, unavailable-live-publication notice and controls are preserved. The reference update does not change page behavior or any screenshot tolerance.

The earlier parent run also failed the mobile connection-page screenshot. That failure did not reproduce in the complete `278c242` run, so its baseline is left unchanged. No broad snapshot regeneration, layout masking, tolerance increase or accessibility exclusion was used.

## Hosted infrastructure

A dedicated `operation-automated-lo` Supabase project (`vonesqpyfsrhasuxfiiz`, US East) was provisioned in Jonathan's personal organization and all ten migrations were applied. The separate `oalo_web` login was verified against the transaction pooler with the official Supabase CA and certificate verification enabled. The probe confirmed no migration-owner membership, `app_runtime` role activation and zero property rows visible without a tenant context. Safe verification evidence is retained in `tmp/homeowner-live-runtime-check.json`.

The database adapter now accepts one bounded, validated public CA certificate. Both authentication and report persistence pools consume `OALO_DATABASE_CA_CERT_PEM`; changing the trust configuration invalidates their cached composition. No certificate validation is disabled and no database password is embedded in code. The root certificate fixture is public trust material from Supabase's official certificate distribution, with source attribution next to it.

The feature branch has its own hosted database, origin, CSRF, account-creation and report settings. Provider lookups, delivery and a nonzero allowance remain disabled until a licensed RentCast key and the intended workspace are explicitly configured. An allowlist prevents public account creation from granting paid provider access. The original stable deployment's configuration is unchanged by the branch setup.

## Additional report corrections

The UI now distinguishes paused monthly updates and failed lookup attempts from ordinary on-demand reports. HighLevel delivery requires explicit inactive email and SMS DND settings; missing or partial settings are refused. Mortgage inputs reject mixed confirmed/amortized fields. Monthly cadence uses the scheduled due date when selecting the next month's day.

The default offline verification now includes the dashboard browser suite, so AVM/report scenarios are covered by the main CI gate. The focused legacy campaign browser checks passed all 12 scenarios; the changed guided setup integration file passed all 39 scenarios. Certificate configuration and pool validation passed 64 focused unit tests. The complete authenticated walkthrough accessibility matrix then passed on the local real-PostgreSQL/TLS review runtime (2.6 minutes). All 13 homeowner PostgreSQL tests and the five AVM/report browser scenarios passed again. The final unit coverage gate passed 946 tests; database coverage is 86.84% statements, 80.91% branches, 89.28% functions and 88.51% lines. Complete post-change CI and hosted sign-in outcomes are recorded on PR #69.

Live valuation qualification still requires the licensed RentCast credential. No real provider lookup or customer message has been represented as completed.
