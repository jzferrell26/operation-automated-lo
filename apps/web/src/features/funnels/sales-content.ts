import {
  FunnelSalesSchema,
  type FunnelFields,
  type FunnelKind,
  type FunnelSales,
} from "./model.js";

/** Source-derived offer structure, original copy. No fabricated proof, rates or qualification. */
const WEBINAR = {
  headlineAccent: "stop renting",
  storyTitle: "This could be the year you stop renting.",
  storyText:
    "You do not need another night of searching for answers. You need to understand your down payment, your credit, your monthly budget and what comes next. This workshop walks through the homebuying process in plain English, before you make a big decision.",
  problemTitle: "What is keeping you from your first home?",
  problemOneTitle: "I do not know where to start.",
  problemOneText:
    "Get the steps in the right order, from your first mortgage conversation to making an offer.",
  problemTwoTitle: "I am not sure about the down payment.",
  problemTwoText:
    "Learn which questions to ask about your down-payment options and the cash you may need.",
  problemThreeTitle: "I have questions about my credit.",
  problemThreeText:
    "Understand what to review before applying and how to prepare for a useful conversation.",
  problemFourTitle: "I do not want surprise costs.",
  problemFourText:
    "Look beyond the price of the house to closing costs, taxes, insurance and your monthly budget.",
  solutionTitle: "Less guessing. A real plan for getting the keys.",
  solutionText:
    "Leave with the questions to ask, the information to gather, and a clearer understanding of your next step. Bring your questions. There is no loan application required to attend.",
  presenterRole: "Your homebuying guide",
  formTitle: "Save your seat",
  formNote: "Get the session details and add the webinar to your calendar.",
};
const BUYER = {
  headlineAccent: "right mortgage",
  storyTitle: "Shop for a home with a mortgage plan behind you.",
  storyText:
    "Your home search deserves more than a headline rate. Start with a review of your goals, your budget and the options worth exploring. Know what to prepare before you ask for a preapproval.",
  problemTitle: "A home loan should fit your life. Not the other way around.",
  problemOneTitle: "Your monthly comfort zone",
  problemOneText: "Talk through the full housing payment, not just principal and interest.",
  problemTwoTitle: "Your cash to close",
  problemTwoText: "Understand down payment, closing costs and the other items to plan for.",
  problemThreeTitle: "Your next steps",
  problemThreeText: "Find out which documents and details are needed for a full financing review.",
  problemFourTitle: "Your timeline",
  problemFourText:
    "Build a plan around when you hope to move, whether you are ready now or just getting started.",
  solutionTitle: "Start your home purchase with the right questions answered.",
  solutionText:
    "Tell us a little about your plans. Your mortgage adviser can help you compare the next steps. This inquiry is not a loan application, approval or rate lock.",
  presenterRole: "Your mortgage adviser",
  formTitle: "Start your mortgage inquiry",
  formNote:
    "Tell us where you are in your home search. No sensitive financial documents needed here.",
};
const REFINANCE = {
  headlineAccent: "refinance options",
  storyTitle: "A refinance is more than a new interest rate.",
  storyText:
    "A different payment, access to equity, or a shorter repayment timeline may be worth exploring. The right answer depends on the full cost, your current loan and how long you expect to keep the next one.",
  problemTitle: "Start with what you want your mortgage to do.",
  problemOneTitle: "Explore a different payment",
  problemOneText:
    "Compare a potential payment change against closing costs and the length of the new loan.",
  problemTwoTitle: "Consider using your equity",
  problemTwoText: "Understand cash-out options and the cost of borrowing against your home.",
  problemThreeTitle: "Revisit your payoff timeline",
  problemThreeText: "Discuss a shorter term and the trade-offs that come with a different payment.",
  problemFourTitle: "See the full comparison",
  problemFourText: "Review the balance, fees, payment and time horizon together before deciding.",
  solutionTitle: "Find out whether a refinance fits your goals.",
  solutionText:
    "Request a personal mortgage review. No blanket savings promises, no obligation to apply, and no rate or approval claimed from this inquiry.",
  presenterRole: "Your refinance adviser",
  formTitle: "Request your refinance review",
  formNote:
    "Choose your goal. We will help you understand the information needed to compare your options.",
};
const GUIDE = {
  headlineAccent: "homebuyer checklist",
  storyTitle: "Know what to ask. Before you make an offer.",
  storyText:
    "Keep the important homebuying questions in one place. Use this guide to organize your mortgage conversation, understand the costs to discuss and prepare for the steps ahead.",
  problemTitle: "A practical guide for your next big decision.",
  problemOneTitle: "Before your mortgage conversation",
  problemOneText: "Organize your goals, timing and the questions you want answered.",
  problemTwoTitle: "Before you shop",
  problemTwoText: "Discuss monthly housing costs and the cash needed to close.",
  problemThreeTitle: "Before you make an offer",
  problemThreeText: "Know what to ask about financing, deadlines and the next steps.",
  problemFourTitle: "Before closing day",
  problemFourText:
    "Keep track of the items to review with your mortgage and real estate professionals.",
  solutionTitle: "Make your first homebuying conversation a better one.",
  solutionText:
    "Get the guide, keep it handy, and book a conversation when you want to apply it to your own plans.",
  presenterRole: "Your mortgage resource",
  formTitle: "Get your copy",
  formNote: "Access the guide and choose whether you would like help with your next step.",
};
export function salesDefaults(kind: FunnelKind): FunnelSales {
  return FunnelSalesSchema.parse(
    kind === "refinance"
      ? REFINANCE
      : kind === "buyer"
        ? BUYER
        : kind === "lead-magnet"
          ? GUIDE
          : {
              ...WEBINAR,
              ...(kind === "on-demand"
                ? {
                    formTitle: "Get access to the webinar",
                    formNote: "Watch on your schedule, then book a call when you are ready.",
                    presenterRole: "Your webinar presenter",
                  }
                : {}),
            },
  );
}
export function salesContent(kind: FunnelKind, fields: FunnelFields): FunnelSales {
  return fields.sales ?? salesDefaults(kind);
}
