export const phaseZeroUiTokens = Object.freeze({
  background: "#07111f",
  foreground: "#f8fafc",
  accent: "#38bdf8",
});

export { uiTokens } from "./tokens.js";
export type { UiTokens } from "./tokens.js";

export { Button, SafeAction } from "./components/Button.js";
export type {
  ButtonProps,
  ButtonSize,
  ButtonVariant,
  SafeActionConfirmation,
  SafeActionDecision,
  SafeActionProps,
} from "./components/Button.js";

export { Icon, IconButton } from "./components/Icon.js";
export type {
  IconButtonProps,
  IconName,
  IconProps,
  IconSize,
  IconTone,
} from "./components/Icon.js";

export { ThemeSegmentedControl } from "./components/ThemeSegmentedControl.js";
export type {
  ThemePreference,
  ThemeSegmentedControlProps,
} from "./components/ThemeSegmentedControl.js";

export {
  AsyncState,
  DegradedState,
  EmptyState,
  ErrorState,
  LoadingState,
  PermissionState,
} from "./components/async-state.js";
export type {
  AsyncStateKind,
  AsyncStateProps,
  DegradedStateProps,
  EmptyStateProps,
  ErrorStateProps,
  LoadingStateProps,
  PermissionStateProps,
} from "./components/async-state.js";

export { Metric } from "./components/metric.js";
export type { MetricProps, MetricState } from "./components/metric.js";

export { OnboardingChecklist, OnboardingChecklistItem } from "./components/onboarding-checklist.js";
export type {
  CompleteOnboardingItem,
  IncompleteOnboardingItem,
  OnboardingChecklistItemModel,
  OnboardingChecklistItemProps,
  OnboardingChecklistProps,
  OnboardingEvidence,
  OnboardingItemState,
} from "./components/onboarding-checklist.js";

export { Card, Stack, Surface } from "./components/structural.js";
export type {
  CardProps,
  StackAlign,
  StackGap,
  StackProps,
  SurfacePadding,
  SurfaceProps,
  SurfaceVariant,
} from "./components/structural.js";
