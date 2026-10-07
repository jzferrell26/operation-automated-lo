import { type FunnelDefinition, type FunnelFields, type FunnelKind } from "./model.js";

const COMMON: FunnelFields = {
  eyebrow: "A clearer next step",
  headline: "Make your next move with confidence.",
  description: "Start with useful information and a real conversation about your goals.",
  cta: "Let's get started",
  offerTitle: "Your next chapter",
  sectionTitle: "Clarity before commitment.",
  finalTitle: "Your next step can be a simple one.",
  finalText: "Start with clear information and a conversation that puts your goals first.",
  benefitOneTitle: "Understand your options",
  benefitOneText: "Know which questions to ask before choosing your next step.",
  benefitTwoTitle: "Make a personal plan",
  benefitTwoText: "Put your priorities first, with guidance built around your situation.",
  benefitThreeTitle: "Move at your pace",
  benefitThreeText: "Get practical information without pressure to make a decision today.",
  hostBio:
    "I help people turn mortgage questions into a practical plan. We will talk through your goals, explain the options and make the next step easier to understand.",
  faqOneQuestion: "Is this a loan application?",
  faqOneAnswer:
    "No. This is a starting point for education and a conversation. A loan application is a separate step.",
  faqTwoQuestion: "Do I need to have everything figured out?",
  faqTwoAnswer: "Not at all. Bring your questions and we can work through the next steps together.",
  faqThreeQuestion: "Will I receive a guaranteed rate or approval?",
  faqThreeAnswer:
    "No. Rates, terms and eligibility depend on a full review of your situation and the available loan options.",
  confirmationTitle: "You're all set for the live session.",
  confirmationText: "Add the session to your calendar and bring the questions you want answered.",
  bookingTitle: "Let's make this personal.",
  bookingText: "Choose a time to talk through your questions and leave with a clearer next step.",
  thanksTitle: "Here's to your next chapter.",
  thanksText:
    "We look forward to the conversation. Keep the booking confirmation from your scheduling page for your appointment details.",
  videoUrl: "",
  bookingUrl: "",
  resourceUrl: "",
  webinarUrl: "",
  eventStartsAt: "",
  eventTimeZone: "America/Chicago",
  eventDurationMinutes: 60,
  heroPhoto: null,
  hostPhoto: null,
  mediaPermissionConfirmed: false,
};
const steps = {
  landing: { id: "landing", label: "Landing page" },
  confirmation: { id: "confirmation", label: "Confirmation" },
  watch: { id: "watch", label: "Watch webinar" },
  book: { id: "book", label: "Book a call" },
  thanks: { id: "thanks", label: "Thank you" },
} as const;
export const FUNNELS: readonly FunnelDefinition[] = [
  {
    kind: "live-webinar",
    name: "Live webinar",
    category: "Show up. Teach. Connect.",
    description:
      "An event worth attending, with a registration page and calendar-ready confirmation.",
    steps: [steps.landing, steps.confirmation],
    defaults: {
      ...COMMON,
      eyebrow: "The first-time homebuyer webinar",
      headline: "Your first home starts here. Get a plan to stop renting.",
      description:
        "Understand your down payment, get your credit questions answered, and see what happens from preapproval to closing. A straightforward live workshop for first-time buyers.",
      cta: "Save my seat",
      offerTitle: "The First-Time Homebuyer Webinar",
      finalTitle: "Ready to make this the year you stop renting?",
      finalText:
        "Reserve your seat, bring your questions, and leave with a clearer plan for your first home.",
      sectionTitle: "Leave with a plan. Not a bigger list of questions.",
      benefitOneTitle: "Start with the right numbers",
      benefitOneText:
        "Understand the difference between a purchase price, a monthly housing budget and the cash needed to close.",
      benefitTwoTitle: "Know what happens next",
      benefitTwoText:
        "Walk through the steps from your first mortgage conversation to making an offer and preparing for closing.",
      benefitThreeTitle: "Ask your real questions",
      benefitThreeText:
        "Bring the things you have been wondering about. There is time for a straightforward conversation.",
      faqOneQuestion: "Where does the session take place?",
      faqOneAnswer:
        "Online. The event details and access information are provided when registration is confirmed.",
      faqTwoQuestion: "Who is this session for?",
      faqTwoAnswer:
        "Anyone exploring a first home or looking for a clearer understanding of the buying process.",
    },
  },
  {
    kind: "on-demand",
    name: "On-demand webinar",
    category: "Your expertise. On their schedule.",
    description: "Turn one great presentation into an access, watch and book-a-call experience.",
    steps: [steps.landing, steps.watch, steps.book],
    defaults: {
      ...COMMON,
      eyebrow: "First-time homebuyer training · On demand",
      headline: "Understand the homebuying process. Before you make your first move.",
      description:
        "Press pause on the conflicting advice. Watch a practical walkthrough of the homebuying journey, then get personal guidance when you are ready.",
      cta: "Get access to the webinar",
      offerTitle: "Your First Home: The On-Demand Workshop",
      finalTitle: "Get the homebuyer answers. Then take your next step.",
      finalText:
        "Watch the full session on your schedule. Book a personal conversation when you are ready to put what you learned into a plan.",
      sectionTitle: "The answers you need. The pace you choose.",
      benefitOneTitle: "Watch the big picture",
      benefitOneText:
        "See how preparation, financing, shopping and closing fit together before you dive into the details.",
      benefitTwoTitle: "Replay what matters",
      benefitTwoText:
        "Take notes and revisit the sections that relate to your questions. There is no rush to keep up.",
      benefitThreeTitle: "Turn learning into a plan",
      benefitThreeText:
        "When you are ready, book a conversation to discuss how these ideas apply to your own goals.",
      faqOneQuestion: "Is this a live event?",
      faqOneAnswer: "This is a recorded session that you can watch on your own schedule.",
      confirmationTitle: "Your session is ready.",
      confirmationText:
        "Settle in, take notes, and bring your questions to a personal conversation afterwards.",
    },
  },
  {
    kind: "buyer",
    name: "Buyer",
    category: "From someday to a next step.",
    description:
      "A focused home-purchase journey that turns uncertainty into a personal conversation.",
    steps: [steps.landing, steps.book, steps.thanks],
    defaults: {
      ...COMMON,
      eyebrow: "Home purchase financing",
      headline: "Find the right mortgage. Before you find the house.",
      description:
        "Before the listings, the open houses and the big decisions, get a mortgage conversation built around you. Your priorities. Your questions. Your next chapter.",
      cta: "Explore my home loan options",
      offerTitle: "Your Home Purchase Plan",
      finalTitle: "Start with your mortgage options. Then shop with a plan.",
      finalText:
        "Tell us where you are in your home search. Get a personal starting point for your mortgage conversation, without an obligation to apply.",
      sectionTitle: "Less second-guessing. More direction.",
      benefitOneTitle: "Know where you stand",
      benefitOneText:
        "Talk through your plans and the information needed to explore your financing options.",
      benefitTwoTitle: "Look beyond the price tag",
      benefitTwoText:
        "Understand the costs that belong in your housing budget, including the expenses beyond the loan payment.",
      benefitThreeTitle: "Shop with a plan",
      benefitThreeText:
        "Know the next steps for financing before you begin making decisions on a home.",
      bookingTitle: "Tell us about your next home.",
      bookingText:
        "A real conversation is the best place to begin. Choose a time that works for you.",
    },
  },
  {
    kind: "refinance",
    name: "Refinance",
    category: "A better fit starts with a review.",
    description:
      "A goal-first mortgage review without blanket savings claims or a confusing rate table.",
    steps: [steps.landing, steps.book, steps.thanks],
    defaults: {
      ...COMMON,
      eyebrow: "Your personal mortgage review",
      headline: "Compare your refinance options. Make your next mortgage work for you.",
      description:
        "A refinance should support a goal, not just a headline rate. Explore the trade-offs with someone who will look at the full picture with you.",
      cta: "Get my refinance review",
      offerTitle: "Your Refinance Comparison",
      finalTitle: "Make your next mortgage decision with the full picture.",
      finalText:
        "Request a review of your goals, current loan and potential trade-offs. A lower payment is not the whole story.",
      sectionTitle: "Start with your goal. Then look at the numbers.",
      benefitOneTitle: "Review your payment",
      benefitOneText:
        "Compare potential payment changes with closing costs, loan term and the amount of time you expect to keep the loan.",
      benefitTwoTitle: "Understand your equity",
      benefitTwoText:
        "Discuss available options and the implications of borrowing against your home before deciding what fits.",
      benefitThreeTitle: "Consider the full cost",
      benefitThreeText:
        "Look beyond the monthly figure. A longer term or different balance can change the total amount you pay.",
      faqOneQuestion: "Does refinancing always save money?",
      faqOneAnswer:
        "No. The result depends on the new terms, closing costs, your existing loan and how long you keep the new loan.",
      bookingTitle: "Let's review the whole picture.",
      bookingText:
        "Bring your goals and questions. We will help you understand what information is needed for a useful comparison.",
    },
  },
  {
    kind: "lead-magnet",
    name: "Lead magnet",
    category: "Give value before asking for a call.",
    description: "A polished resource offer, a clear download step and an invitation to talk.",
    steps: [steps.landing, steps.book, steps.thanks],
    defaults: {
      ...COMMON,
      eyebrow: "The first-time homebuyer's field guide",
      headline: "Get the homebuyer checklist you will wish you had sooner.",
      description:
        "A practical guide for a decision that deserves more than guesswork. Keep the important questions close, and take the next step with more confidence.",
      cta: "Get the guide",
      offerTitle: "The Homebuyer Field Guide",
      finalTitle: "The right questions can change your next conversation.",
      finalText:
        "Get the guide. Keep it handy. Use it to make a more informed start on your homebuying journey.",
      sectionTitle: "A useful resource. Not another sales pitch.",
      benefitOneTitle: "Get organized",
      benefitOneText:
        "Bring the important questions into one place before you start your next conversation.",
      benefitTwoTitle: "Look at the full picture",
      benefitTwoText:
        "Use a structured checklist to discuss your priorities, preparation and potential costs.",
      benefitThreeTitle: "Make your next step count",
      benefitThreeText:
        "Turn what you learn into a personal conversation when you are ready for guidance.",
      bookingTitle: "Your guide is here. Your next step is up to you.",
      bookingText:
        "Download your resource below. Book a conversation when you would like help turning those questions into a plan.",
      thanksTitle: "Good questions lead to better conversations.",
      thanksText: "Keep your guide handy. We look forward to helping you find a clear next step.",
      faqOneQuestion: "What happens after I request the guide?",
      faqOneAnswer:
        "You will be able to access the resource and choose whether to book a conversation for personal guidance.",
    },
  },
];
export function funnelDefinition(kind: FunnelKind): FunnelDefinition {
  const definition = FUNNELS.find((item) => item.kind === kind);
  if (!definition) throw new Error("Unknown funnel");
  return definition;
}
