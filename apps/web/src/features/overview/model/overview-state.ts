import type { OverviewStateKind } from "../../ui-foundation/model/synthetic-ui.js";

export type OverviewStatePresentation = Readonly<{
  kind: "loading" | "empty" | "error" | "permission_restricted" | "degraded";
  title: string;
  description: string;
}>;

/**
 * What the overview says in each of its states, in the words the user-language contract asks for
 * (PRD-006b D1 and D3). Each one names what is true and, where there is one, what to do next.
 */
export function getOverviewStatePresentation(state: OverviewStateKind): OverviewStatePresentation {
  switch (state) {
    case "loading":
      return {
        kind: "loading",
        title: "Loading your workspace",
        description: "Labels stay put while the numbers load, so nothing jumps around.",
      };
    case "new_workspace":
      return {
        kind: "empty",
        title: "A fresh start",
        description: "Nothing has happened here yet. Finishing setup is the next thing to do.",
      };
    case "setup_incomplete":
      return {
        kind: "empty",
        title: "Setup isn't finished",
        description: "Connect your accounts first. Everything after that unlocks together.",
      };
    case "blocked":
      return {
        kind: "error",
        title: "Something is blocking you",
        description: "One thing is missing, and this says who can sort it out.",
      };
    case "healthy_without_campaign":
      return {
        kind: "empty",
        title: "All set, no campaigns yet",
        description: "Everything is working. You just haven't created a campaign yet.",
      };
    case "provider_degraded":
      return {
        kind: "degraded",
        title: "HighLevel is having trouble",
        description: "You're seeing the last thing we knew for sure while we check again.",
      };
    case "unavailable_data":
      return {
        kind: "empty",
        title: "We can't show this number",
        description: "There's no reliable source for it, so we won't put a number in its place.",
      };
    case "restricted_viewer":
      return {
        kind: "permission_restricted",
        title: "These numbers are hidden from you",
        description: "Nothing from another workspace is shown here, and nothing is guessed at.",
      };
    case "authorized_agency":
      return {
        kind: "empty",
        title: "Agency view",
        description: "Only the workspaces your sign-in covers can appear here.",
      };
    case "route_error":
    case "safe_retry":
      return {
        kind: "error",
        title: "You can try again",
        description: "Nothing was changed, so trying again can't do anything twice.",
      };
  }
}
