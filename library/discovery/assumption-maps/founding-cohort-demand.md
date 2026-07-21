# Assumption Map: Founding Cohort Demand

**Solution:** A $500, 20-seat Operation Automated LO founding offer with 90 days included and a stated $197 monthly continuation option.

**Opportunity addressed:** Not yet validated as an OST opportunity. The current product thesis is tested directly through interviews and paid behavior.

**Date:** 2026-07-20

## Assumption Inventory

| ID | Assumption | Axis | Importance | Uncertainty | Score | Quadrant |
| --- | --- | --- | ---: | ---: | ---: | --- |
| A1 | Qualified loan officers repeatedly experience the page, flyer, ad, follow-up, and CRM pipeline as one painful job. | D | 3 | 3 | 9 | Kill Zone |
| A2 | At least 15 eligible accounts will complete a $500 payment for the exact versioned offer after a truthful working demo. | V | 3 | 3 | 9 | Kill Zone |
| A3 | Buyers accept that the founding demo includes clearly labeled synthetic, manual, and unavailable provider states. | D | 3 | 3 | 9 | Kill Zone |
| A4 | The offer's fixed scope is preferable to custom funnel, automation, or ad-management services. | D | 3 | 3 | 9 | Kill Zone |
| A5 | The team can explain setup requirements, exclusions, delivery gates, and refund terms clearly enough for an informed decision. | U | 3 | 2 | 6 | Monitor |
| A6 | Qualified founders control or can obtain the HighLevel and Meta authority required for a future launch. | F | 3 | 3 | 9 | Kill Zone |
| A7 | The 90-day included period and stated continuation option support a viable cohort without creating a custom-service obligation. | V | 3 | 3 | 9 | Kill Zone |
| A8 | The existing community provides enough reachable, eligible accounts to test demand within 14 days. | F | 3 | 2 | 6 | Monitor |
| A9 | A three to five minute demonstration is sufficient for the buyer to understand the outcome and important boundaries. | U | 2 | 3 | 6 | Park |
| A10 | Payment, refund, and eligibility evidence can be reconciled without placing participant PII or payment data in Git. | F | 3 | 1 | 3 | Monitor |

## Kill Zone Summary

| Assumption | Why it can kill the offer |
| --- | --- |
| A1 | Without a recurring customer problem, the offer is a product thesis without a job to be done. |
| A2 | Fewer than 15 paid accounts leaves commercial demand unproven. On 2026-07-20, the product owner accepted that constraint and directed implementation to proceed without claiming G8 PASS. |
| A3 | If buyers pay only when synthetic or manual boundaries are hidden, the demand signal is invalid and unethical. |
| A4 | If buyers mainly want custom services, the scalable SaaS offer is mis-shaped. |
| A6 | Buyers without the required account authority cannot become valid founding locations. |
| A7 | If the offer creates unsustainable service or delivery obligations, paid demand does not prove viable demand. |

## Selected Assumption to Test First

**Assumption:** A2, at least 15 eligible accounts will complete a $500 payment for the exact versioned offer after a truthful working demo.

**Archetype:** Concierge pricing and paid-demand experiment.

**Rationale:** Completed payment is the strongest available behavioral test of viability and desirability. The concierge format permits an honest demonstration before production provider functionality exists, provided every manual, synthetic, unavailable, and gated behavior is disclosed.

**Experiment:** `library/discovery/experiments/2026-07-20-founding-cohort-demand.md`

**Decision state:** No evidence currently proves the 15-paid-founder threshold. A2 remains an unvalidated commercial assumption and the experiment remains available as post-start learning. It is not an implementation prerequisite under the 2026-07-20 product-owner decision.

## Required Companion Evidence

- Use JTBD interviews to test A1, A3, A4, and A6 without turning the interviews into feature-request sessions.
- Record support or customization requests separately. Repeated requests for custom service are evidence against A4 and A7.
- Do not revise success thresholds after results are known.
