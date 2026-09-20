/**
 * The words in the guided setup, step by step (PRD-006b D10 and PRD-006c D3).
 *
 * PRD-006c builds the sheet, the stepper, and the seven step components and imports its copy from
 * here. The steps are written as one continuous conversation with a loan officer who has just
 * created an account: every step says what it wants, and the last one says what happens next while
 * nothing is connected.
 */

export const GUIDED_SETUP_TOTAL_STEPS = 7;

/** The live-region announcement when a step opens. */
export function guidedSetupStepAnnouncement(position: number, title: string): string {
  return `Step ${position} of ${GUIDED_SETUP_TOTAL_STEPS}: ${title}`;
}

/**
 * The controls every step carries. "Not now" saves progress; it never loses typed text.
 *
 * `closeStep` is the accessible name on the panel's own close control, and PRD-006d ruled that it
 * stays rather than being folded into "Not now". They are two different promises: "Not now" ends
 * the walkthrough and is the footer's visible words, while the close control puts this one panel
 * away and leaves the walkthrough where it is. Giving both the same name would tell a screen-reader
 * user that the two do the same thing, which is the kind of small lie that makes a walkthrough
 * untrustworthy. It lives here because every string a person reads or hears lives in a copy module
 * (PRD-006b D6).
 */
export const GUIDED_SETUP_CONTROLS = Object.freeze({
  dismiss: "Not now",
  continueLabel: "Continue",
  back: "Back",
  closeStep: "Close this step",
  finishChip: "Finish setup",
  restart: "Show me around again",
});

export const GUIDED_SETUP_STEPS = Object.freeze({
  welcome: Object.freeze({
    position: 1,
    title: "Let's set up your first Open House Boost",
    body: "It takes about three minutes.",
    primaryLabel: "Let's go",
  }),
  yourDetails: Object.freeze({
    position: 2,
    title: "Your details",
    body: "We'll reuse these on every campaign, so you only type them once.",
    nameLabel: "Your name",
    companyLabel: "Company or team",
    nmlsLabel: "NMLS number (optional)",
    phoneLabel: "Phone (optional)",
  }),
  realtorPartner: Object.freeze({
    position: 3,
    title: "Your Realtor partner",
    body: "Who are you running this open house with?",
    realtorNameLabel: "Realtor's name",
    brokerageLabel: "Brokerage (optional)",
  }),
  createCampaign: Object.freeze({
    position: 4,
    title: "Create the Open House Boost",
    body: "We've filled in what we can. Add the address, the state, and the two dates, then confirm you have permission to market the property and the Realtor's materials.",
    starterTextNote: "Starter text, edit as you like",
    submitHint: "When it looks right, choose Save and run the checks.",
  }),
  readTheResult: Object.freeze({
    position: 5,
    title: "Read the result",
    readyBody: "Your campaign is saved and ready for approval. Nothing has been published or sent.",
    needsChangesBody:
      "Your campaign is saved, and the checks found things to fix first. Each one says what it means and how to fix it.",
  }),
  approveOrHandOff: Object.freeze({
    position: 6,
    title: "Approve, or hand it to an approver",
    approveBody: "Choose Approve this version. Nothing is published or sent.",
    handOffBody:
      "Only an approver or your workspace owner can approve. Copy this link and send it to them.",
    copyLinkLabel: "Copy link",
    copiedNotice: "Link copied.",
  }),
  whatHappensNext: Object.freeze({
    position: 7,
    title: "What happens next",
    body: "Your campaign is saved and approved. It won't run as an ad yet: HighLevel and Meta aren't connected. When they are, this is where you'll launch it.",
    primaryLabel: "Done",
  }),
});
