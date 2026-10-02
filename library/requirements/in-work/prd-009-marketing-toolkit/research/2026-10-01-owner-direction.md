> Research input for [PRD-009](../prd-009-marketing-toolkit-index.md). The product owner's own decisions, recorded in chat on 2026-10-01 and copied here unchanged from the authoring session's scratch folder. The `design/` paths below are relative to the PRD-009 folder.

# PRD-009 owner direction (Jonathan Ferrell, in chat, 2026-10-01)

These are the owner's own decisions, given in conversation after he signed up on the live app (operation-automated-lo-web.vercel.app, PRD-008 merged as `e89058e`) and saw it. Treat them as binding inputs. Where a decision conflicts with an older brief, spec, or PRD criterion, the decision wins, and the older text gets an explicit, dated supersession.

## What he saw
His words: "UI looks like crap right now."
- A brand-new self-serve account lands on /overview.
- That page repeats "HighLevel, Meta, and Stripe aren't connected" 16 times and shows 9 "Not connected" metric cards.
- The guided-setup panel floats over the page and covers the numbers.
- The dark navy sidebar dominates the screen.
- The nav includes Leads and Pipeline, and Automations.

Every design check so far looked at demo or seeded data. None looked at the empty brand-new account.

## Decisions
- **OD-A: a marketing toolkit, not a CRM.**
  - In his words: "this should not have pipelines and automations, this is not a CRM. It is supposed to be the marketing Tool kit." And: "If we make it too much like a CRM then we are going up against Highlevel which we are supposed to be a connector to highlevel."
  - HighLevel stays the system of record for contacts, pipelines and automations.
- **OD-B: the core is a fast Facebook ads launch.**
  - His words: "it should be like click click launch facebook ads."
  - Open House Boost in three steps: bring in the property, make it yours (the loan officer's brand plus a Realtor partner), review the actual ad, then approve and launch.
- **OD-C: the sections that stay.**
  - Home (the Overview, as a marketing home);
  - Campaigns (the launch flow and the campaign list);
  - Brand;
  - Realtor Partners (he chose to keep this explicitly);
  - Homeowner reports;
  - Settings: account, the HighLevel connection, the Meta connection, and where new leads go in HighLevel. That lead hand-off stays, because it is the "connector" part.
- **OD-D: the sections that go.**
  - Leads and Pipeline (/leads, /leads/pipeline), Automations (/automations), the separate Reports page (/reports), and Workspace tools (/marketplace). He did not tick Campaign results, the lead hand-off view, or Add-ons.
  - Campaign results (spend, leads sent to HighLevel, cost per lead) live on each campaign's own page instead. They show an honest "not connected" state until Meta and HighLevel are connected.
- **OD-E: the lighter look.**
  - His words: "I like the lighter look of automatedre better than the darker version of this."
  - Adopt the light AutomatedRE / Listing Studio look:
    - a white or very light background;
    - a light navigation instead of the dark navy rail;
    - navy only for text or a small anchor;
    - one action blue;
    - bordered cards;
    - one obvious primary button per screen.
  - The Light/Dark/System toggle stays. Light becomes the default that everything is designed and checked against.
  - This supersedes the 2026-07-20 brief's "deep navy anchor" (`library/knowledge/private/ux-ui/00-design-brief.md`, section 3).
- **OD-F: borrow Broker Marketplace's feel, not its features.**
  - Borrow its calm, one-question-to-start feel. Its Open House Genie opens with one card, "Enter a property address to get started", a single big button, and small secondary buttons above.
  - His words: "We are not copying all their stuff." Do not copy its tool catalog, rate tickers, AutoPilot, Agent Monitor, or branding.
- **OD-G: Listing Studio is the model and a reuse source.**
  - Listing Studio is the owner's own private repo, jzferrell26/listing-studio (live as automatedre.com).
  - Reuse its pieces where they fit: visual tokens, the review-the-real-output and confirm patterns, and the loan officer plus Realtor co-branding and consent model.
  - Zillow/Redfin link import has an open legal question: no Terms of Use review exists, and Zillow photos in paid ads carry copyright risk. So link import is an owner decision. Manual entry is the default path.

## Constraints that do not change
- Live Meta publishing stays off.
  - It is gated: Meta connection, app review, and research gate G3 are operator and owner items.
  - The launch step is built and ready, says honestly when Meta is not connected, and never pretends to launch.
- No fake numbers anywhere (the honesty rule from PRD-004 to PRD-006).
- The user-language contract (`library/knowledge/private/standards/user-language-contract.md`) still governs every sentence.
- Approval before launch stays (compliance: Housing Special Ad Category). It is part of the three steps, not extra screens.

## Owner answers on the design proposal (2026-10-01, after seeing the six mockups in `design/mockups/previews/`)
- **Look and layout: "Yes, as shown."** The light look with a top menu (Home, Campaigns, Brand, Realtor partners, Homeowner reports, Settings). This resolves open decision D-2 in favor of the top bar.
- **D-1, Zillow or Redfin link import: "Yes, include it."** The owner chose this against the recommendation and accepts the legal risk: there is no Terms of Use review, and Zillow photos in paid ads carry copyright risk. Import Listing Studio's guarded import, keeping all of these:
  - its permission checkbox ("I am authorized to import this property content. I will verify it before publishing.");
  - the exact-URL allowlist;
  - the hardened fetch;
  - the photo CDN allowlist;
  - the rate limit;
  - provenance.

  Manual entry stays available. Record the accepted risk in the PRD and add a recommended counsel review to the operator checklist.
- **D-9, approve and launch: two buttons.** Approve first (a compliance sign-off on one exact version, with nothing published). Then Launch on Facebook (spends money). Each act gets its own confirmation.
- **D-4, Homeowner reports: "Always show it."** The menu item is visible for every account, not only when the switch is on. The page keeps its honest states when lookups are off.
- **Every other open decision (D-3, D-5 to D-8, D-10 to D-15):** follow the designer's recommendation in `design/01-open-decisions.md`.
