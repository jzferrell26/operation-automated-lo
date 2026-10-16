# AutomatedLO hosted migration inventory

Read-only inspection on October15 UTC (October14 Chicago) confirmed project `vonesqpyfsrhasuxfiiz`, named `operation-automated-lo`, is ACTIVE_HEALTHY in us-east-1. The project API reports database image17.6.1.166, PostgreSQL major17. This is the saved project from the activation guide, not one of the unrelated projects returned by the connector's initial list.

The migration API reports17 applied versions through `20261006233000_funnel_inquiry_retention`. The completion-resume source has26 migrations. These9 versions have no matching hosted migration record:

- 20261013210000_financing_media
- 20261013230000_webinar_ad_destination
- 20261014050000_webinar_publisher
- 20261014051000_financing_release
- 20261014060000_funnel_domains
- 20261014120000_financing_public_http
- 20261014130000_webinar_publisher_auth
- 20261014160000_publisher_authentication_lock_order
- 20261014170000_homeowner_provider_budget

Read-only catalog checks also confirm absence of `campaign.financing_media`, `campaign.financing_releases`, `campaign.funnel_domains`, `campaign.webinar_publisher_launches`, `campaign.webinar_publisher_authentications` and `homeowner.provider_account_budgets`. An earlier exploratory query used `financing.media_assets`, which is not the relation named by this source; it is excluded from the evidence above.

No customer records, credentials or provider keys were read. No hosted DDL, DML, role membership, environment change, deployment, live valuation, ad launch or message occurred. The current source/hosted gap is confirmed; exact source hashes for historically applied migrations and current runtime environment settings were not inspected.

Next release prerequisite: complete current-head CI and source closeout, then prepare the ordered additive migration and environment rollout against this confirmed project. Apply only missing versions through the established migration-owner procedure; do not reset the database. Keep unqualified provider features disabled. Source passing does not make the hosted runtime current.
