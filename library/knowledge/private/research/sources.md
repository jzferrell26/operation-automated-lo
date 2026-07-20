# Research Sources

Research snapshot: July 19, 2026.

## HighLevel primary sources

- [HighLevel scopes catalog](https://marketplace.gohighlevel.com/docs/Authorization/Scopes/index.html)
- [Marketplace app distribution model](https://marketplace.gohighlevel.com/docs/oauth/AppDistribution/index.html)
- [Agency versus sub-account go-to-market model](https://marketplace.gohighlevel.com/docs/oauth/AgencyVsSubAccount/)
- [OAuth 2.0](https://marketplace.gohighlevel.com/docs/2021-04-15/Authorization/OAuth2.0/index.html)
- [Marketplace app creation](https://marketplace.gohighlevel.com/docs/oauth/CreateMarketplaceApp/index.html)
- [Marketplace app review guidelines](https://marketplace.gohighlevel.com/docs/oauth/AppReviewGuidelines/index.html)
- [Marketplace App Test guide](https://marketplace.gohighlevel.com/docs/oauth/AppTestingGuide/)
- [Private app installation limit](https://marketplace.gohighlevel.com/docs/MarketplacePolicies/PrivateAppInstallLimits/)
- [Custom Pages](https://marketplace.gohighlevel.com/docs/2023-02-21/marketplace-modules/CustomPages/index.html)
- [Signed user context](https://marketplace.gohighlevel.com/docs/2021-07-28/other/user-context-marketplace-apps/index.html)
- [App install webhook](https://marketplace.gohighlevel.com/docs/webhook/AppInstall/)
- [Webhook integration and signatures](https://marketplace.gohighlevel.com/docs/2021-07-28/webhook/WebhookIntegrationGuide/index.html)
- [OAuth FAQ, token duration and rate limits](https://marketplace.gohighlevel.com/docs/oauth/Faqs/)
- [Facebook Ad Manager API](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/facebook-ads/index.html)
- [Google Ad Manager API](https://marketplace.gohighlevel.com/docs/ghl/ad-publishing/google-ads/)
- [External billing webhook](https://marketplace.gohighlevel.com/docs/oauth/Billing/index.html)

## Competitor primary sources

### UpHex

- [UpHex for HighLevel](https://ghl.uphex.com/)
- [Ad Blueprints](https://uphex.com/features/adblueprints)
- [AdScope360](https://uphex.com/features/adscope360/)
- [Pricing](https://uphex.com/pricing)
- [Connect UpHex to GHL](https://help.uphex.com/en/articles/10007805-how-to-connect-uphex-to-ghl-creating-your-custom-menu-link)
- [Launch an ad](https://help.uphex.com/en/articles/5718814-how-to-launch-an-ad-in-uphex)
- [Lead push and tagging](https://help.uphex.com/en/articles/9681520-automatically-push-leads-into-go-highlevel-with-tagging)
- [Form field mapping](https://help.uphex.com/en/articles/12648041-how-to-push-leads-from-uphex-into-go-high-level-with-form-fields-mapping)
- [Client metrics](https://help.uphex.com/en/articles/5718809-overview-the-client-metrics-tab-in-uphex)
- [Rebilling setup](https://help.uphex.com/en/articles/9949747-rebilling-setup-part-2-setting-up-clients)

### ListReports

- [Marketing kits guide](https://support.listreports.com/hc/en-us/articles/19181791642259-Marketing-Kits-Guide-for-Loan-Officers-and-Agents)
- [Getting started for loan officers and agents](https://support.listreports.com/hc/en-us/articles/37107768217747-Getting-Started-with-ListReports-Real-Estate-Marketing)
- [Active listing marketing kit](https://support.listreports.com/hc/en-us/articles/27194517956115-Create-a-Marketing-Kit-for-an-Active-Listing)
- [Single-property website](https://welcome.listreports.com/property-website)
- [Marketing-kit QR codes](https://support.listreports.com/hc/en-us/articles/19390563105299-QR-Codes-for-Marketing-Kits)

### myhomeIQ

- [myhomeIQ product](https://www.myhomeiq.com/)
- [Loan officer pricing and features](https://www.myhomeiq.com/pricing)
- [Realtor partnership product](https://www.myhomeiq.com/products/realtor-partnership)

### Marblism

- [Marblism help center](https://help.marblism.com/en/)
- [Working with AI employees](https://help.marblism.com/en/articles/12712363-how-to-work-with-your-ai-employees)

### Broker Marketplace

- [Broker Marketplace product and tool catalog](https://broker-marketplace.com/)

## Compliance and policy sources

- [CFPB RESPA Section 8 FAQs](https://www.consumerfinance.gov/compliance/compliance-resources/mortgage-resources/real-estate-settlement-procedures-act/real-estate-settlement-procedures-act-faqs/)
- [CFPB Regulation Z, section 1026.24 advertising](https://www.consumerfinance.gov/rules-policy/regulations/1026/24/)
- [CFPB Regulation B and ECOA](https://www.consumerfinance.gov/rules-policy/regulations/1002/)
- [Google housing advertising restrictions](https://support.google.com/adspolicy/answer/16701755?hl=en)
- [Google personalized-advertising targeting restrictions](https://support.google.com/adspolicy/answer/143465?hl=en-419)
- [Meta ad creation and Special Ad Category guidance](https://www.facebook.com/help/messenger-app/621956575422138/)
- [FTC CAN-SPAM compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [FCC TCPA small-entity guide](https://docs.fcc.gov/public/attachments/DA-24-910A1.pdf)
- [Eleventh Circuit opinion vacating the FCC one-to-one consent rule](https://media.ca11.uscourts.gov/opinions/pub/files/202410277.pdf)
- [FCC filing confirming the rule was vacated and further review was not sought](https://docs.fcc.gov/public/attachments/DOC-411016A1.pdf)

## Internal source evidence

The following repositories were reviewed read-only at the revisions recorded in [the source-asset inventory](../product/source-asset-inventory.md):

- `wealth-build-studio`
- `florida-fast-offer`
- `operation-print-money`
- `voyze`
- `brand-engine-template`
- `loan-charm-suite`

## Confidence notes

- High confidence: current public GHL scopes, distribution model, Custom Page behavior, rate limits, ad endpoints, private-app cap, and webhook signature transition.
- High confidence: public competitor capabilities stated on the linked official pages.
- Medium confidence: exact provider payload shapes and account-state behavior, which require authenticated sandbox tests.
- Medium confidence: paired core and Ads Publisher app strategy, which should be validated with HighLevel Marketplace review.
- Legal review required: RESPA, Regulation Z, fair lending, TCPA, CAN-SPAM, state law, lender policy, and data licensing as applied to the final implementation.
