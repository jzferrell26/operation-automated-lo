# Compliance and Risk Boundaries

## Status

This document is product risk research, not legal advice. Mortgage counsel and each lender's compliance officer must approve the implemented controls, campaign templates, disclosures, data sources, and operating process before production use.

The product must be sold as **compliance-aware and approval-gated**, never as automatically compliant, RESPA compliant, or guaranteed to pass lender or ad-platform review.

## Non-negotiable product controls

1. Every tenant has a versioned lender compliance profile.
2. Every published campaign points to immutable input, asset, disclosure, targeting, and budget versions.
3. Every campaign has a named human approver and approval timestamp.
4. Any material change invalidates approval.
5. The product records who performed every external write.
6. Destructive ad operations and audience uploads are not exposed in the first release.
7. Public property and consumer data are minimized and retained under a documented schedule.
8. The product never infers legal permission from the presence of data in GHL.

## RESPA Section 8 and Realtor partnerships

The CFPB states that RESPA Section 8 prohibits giving or accepting a fee, kickback, or thing of value under an agreement or understanding for referrals of settlement-service business. A thing of value can include services at free or special rates. Marketing services agreements are fact-specific. Permitted compensation must relate to actual, necessary, distinct services and reasonable market value, not referral value.

### Product rules

- Do not reward a Realtor based on referral count, loan volume, application, approval, or closing.
- Do not create a free-service entitlement that is conditional on sending mortgage referrals.
- Do not calculate partner value from referred settlement-service revenue.
- Do not split ad spend or charge a Realtor through the MVP.
- Keep the Meta ad account and billing relationship client-owned.
- Require the loan officer to confirm that any co-marketing arrangement has lender approval.
- Preserve the actual assets, delivery, dates, parties, and costs if a paid marketing-services arrangement is introduced later.
- Add a counsel-approved operating policy before implementing Realtor payments, sponsorships, shared budgets, or reimbursement.

The product can help document facts. It cannot decide whether a specific arrangement is lawful.

## Truth in Lending and mortgage advertising

Regulation Z covers commercial messages that promote consumer credit, including internet, print, and electronic advertisements. Closed-end credit advertising requirements are in 12 CFR 1026.24. Certain stated terms can trigger additional disclosures, and advertised terms must actually be available.

### Product rules

- Separate general brand or property advertising from loan-term advertising.
- Treat rates, APR, payment amounts, down payments, loan terms, and teaser statements as controlled fields, not generated prose.
- Require source, effective date and time, expiration, assumptions, loan program, geography, and approver for any rate or payment claim.
- Use lender-maintained disclosure blocks selected by a deterministic rule, not language invented by a model.
- Fail preflight when a trigger term is present without the required companion disclosures.
- Preserve the exact rendered ad and landing page for the lender's required record-retention period.
- Do not allow an AI service to calculate or improvise loan terms.

The first Open House Boost blueprint should avoid rate and payment claims. This materially reduces risk and review friction.

## Fair lending and ad targeting

Mortgage and housing campaigns can implicate the Equal Credit Opportunity Act, Fair Housing Act, state law, lender policy, and ad-platform access-to-opportunity rules.

Google currently states that Housing, Employment, and Consumer Finance ads in the United States and Canada cannot target by gender, age, parental status, marital status, or ZIP code. Radius, city, and country targeting are allowed subject to policy. Google also limits advertiser-curated audiences for sensitive categories and restricts combining personally identifiable information with ad data.

Meta requires the appropriate Special Ad Category for housing and financial products and services.

### Product rules

- Require the appropriate Meta Special Ad Category and make it non-bypassable for mortgage and housing blueprints.
- Maintain an allowlist of approved targeting fields per channel and campaign category.
- Block age, gender, marital status, parental status, ZIP, protected-class proxies, and other tenant-prohibited dimensions.
- Do not use GHL contacts to create custom audiences in v1.
- Do not generate lookalike or customer-match audiences in v1.
- Show the target geography and exclusions in the final approval summary.
- Monitor delivery and conversion metrics for material geographic or demographic anomalies where lawful data is available.
- Require lender review of every new blueprint and meaningful blueprint revision.

## Listing, photo, logo, and data rights

ListReports' own public flow requires the agent to certify that they are the listing agent or have permission to market the property. Operation Automated LO should use the same basic gate without implying that one checkbox resolves every license issue.

### Required attestations

- User has permission to market the property.
- User has rights to upload and publish each photo, logo, testimonial, and video.
- Property facts were supplied by the user or a named licensed source.
- Realtor and loan officer approve the use of their names, marks, and contact details.
- Any required brokerage, lender, NMLS, Equal Housing, and state disclosures are current.

Do not scrape or republish MLS, portal, AVM, equity, rate, or transaction data without an executed license that covers the product's use, display, storage, derivative assets, and retention.

## Lead consent, SMS, and calls

The product should route consumers into the client's existing GHL communication program instead of creating a second messaging system.

The TCPA and FCC rules can require prior express consent or prior express written consent depending on the technology, content, and call or text. The Eleventh Circuit vacated the FCC's 2023 one-to-one and logically-related consent additions in January 2025. That decision does not remove the underlying TCPA consent, disclosure, revocation, Do-Not-Call, or state-law obligations.

### Product rules

- Use counsel-approved consent text tied to the identified lender or loan officer and selected channels.
- Store the rendered consent disclosure version, page, timestamp, phone number, IP-derived audit metadata, campaign, and submission ID.
- Do not pre-check consent boxes.
- Do not make optional marketing consent a condition of accessing ordinary property information unless counsel approves the flow.
- Send the consent receipt or reference into GHL with the lead.
- Respect GHL DND and consent status before workflow enrollment.
- Provide STOP and other reasonable revocation handling through the client's approved GHL configuration.
- Treat state mini-TCPA and Do-Not-Call requirements as tenant-policy inputs.
- Use single-seller consent as a conservative product default even though the FCC's 2023 one-to-one rule was vacated.

## Commercial email

The FTC's CAN-SPAM guidance requires accurate headers and subjects, an appropriate advertisement disclosure, a valid postal address, a clear opt-out, and timely opt-out processing for commercial email. Hiring a platform or service does not remove the sender's responsibility.

The Brand Engine already proves a preflight model for physical-address and unsubscribe tokens. Operation Automated LO should preserve these checks and add sender identity, lender disclosure, and message-purpose classification.

## Privacy and security

### Data minimization

- Do not store full GHL contact, conversation, borrower, credit, income, Social Security, bank, or loan-application records.
- Do not place personal data in URLs, public page source, analytics events, logs, or ad-platform parameters.
- Store only the GHL object IDs and normalized attribution milestones needed by the product.
- Delete original lead payloads from the job queue after successful GHL routing and the required audit window.

### Retention and deletion

Before beta, define retention for:

- OAuth tokens
- User sessions
- Original photos
- Published and archived artifacts
- Consent receipts
- Provider command logs
- Support logs
- Attribution events

Uninstall should revoke product access immediately, stop jobs, mark tokens unusable, and schedule tenant deletion according to contract and legal retention requirements.

## Approval matrix

| Change | Loan officer | Realtor | Lender compliance | New approval required |
| --- | --- | --- | --- | --- |
| Property facts or photos | Yes | Yes | Tenant policy | Yes |
| Realtor brand or contact details | Yes | Yes | Tenant policy | Yes |
| Loan officer brand or disclosure | Yes | Optional | Yes | Yes |
| General property copy | Yes | Yes | Tenant policy | Yes |
| Rate, APR, payment, or program claim | Yes | Optional | Yes | Yes |
| Targeting, budget, dates, or lead form | Yes | Optional | Tenant policy | Yes |
| Pause campaign | Authorized user | No | No | Command confirmation only |
| Resume after material edit | Yes | As applicable | As applicable | Yes |

## Pre-launch legal checklist

- Mortgage counsel reviews the product terms, privacy policy, data processing terms, and campaign operating model.
- Lender compliance approves the Open House Boost blueprint and disclosure configuration.
- Counsel reviews the Realtor partnership and any free-service or sponsorship structure under RESPA.
- Counsel reviews consent evidence, SMS, call, email, and state-law operating rules.
- Data-provider contracts cover every property, photo, rate, value, equity, or transaction input.
- Meta and Google policy rules are revalidated at implementation and before each new channel launch.
- HighLevel Marketplace security, privacy, and app-review requirements are satisfied.
