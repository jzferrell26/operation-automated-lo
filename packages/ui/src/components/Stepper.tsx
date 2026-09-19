"use client";

import { forwardRef, type HTMLAttributes } from "react";

import { Badge } from "./Badge.js";
import { Icon } from "./Icon.js";
import { joinClassNames } from "./internal.js";

import styles from "./stepper.module.css";

export type StepperStepState = "complete" | "current" | "upcoming" | "blocked";

export type StepperStep = Readonly<{
  description?: string;
  id: string;
  state: StepperStepState;
  title: string;
}>;

export type StepperProps = Omit<HTMLAttributes<HTMLElement>, "children"> &
  Readonly<{
    label?: string | undefined;
    steps: readonly StepperStep[];
  }>;

export type StepperPosition = Readonly<{
  completedCount: number;
  currentIndex: number;
  percentComplete: number;
  positionLabel: string;
  total: number;
}>;

const stepStateLabel: Readonly<Record<StepperStepState, string>> = Object.freeze({
  blocked: "Blocked",
  complete: "Complete",
  current: "In progress",
  upcoming: "Not started",
});

/**
 * Pure progress policy shared by the control and its focused contract tests.
 * Completion is counted from the explicit `complete` state, never from the
 * current position, so that visiting a step never implies finishing it
 * (`03-components/campaign-and-artifact-workflow.md`).
 */
export function resolveStepperPosition(steps: readonly StepperStep[]): StepperPosition {
  const total = steps.length;
  const currentIndex = steps.findIndex((step) => step.state === "current");
  const completedCount = steps.filter((step) => step.state === "complete").length;
  const humanPosition = currentIndex === -1 ? completedCount : currentIndex + 1;

  return {
    completedCount,
    currentIndex,
    percentComplete: total === 0 ? 0 : Math.round((completedCount / total) * 100),
    positionLabel: `Step ${humanPosition} of ${total}`,
    total,
  };
}

export const Stepper = forwardRef<HTMLElement, StepperProps>(function Stepper(
  { className, label = "Guided setup progress", steps, ...stepperProps },
  ref,
) {
  const position = resolveStepperPosition(steps);
  const current = position.currentIndex === -1 ? undefined : steps[position.currentIndex];

  return (
    <nav
      {...stepperProps}
      ref={ref}
      aria-label={label}
      className={joinClassNames(styles.stepper, className)}
    >
      <p className={styles.summary}>
        <span className={styles.position}>{position.positionLabel}</span>
        {current ? <span className={styles.currentTitle}>{current.title}</span> : null}
      </p>
      <div
        aria-label={`${label}, ${position.completedCount} of ${position.total} steps complete`}
        aria-valuemax={position.total}
        aria-valuemin={0}
        aria-valuenow={position.completedCount}
        aria-valuetext={`${position.completedCount} of ${position.total} steps complete`}
        className={styles.track}
        role="progressbar"
      >
        <div className={styles.trackFill} style={{ inlineSize: `${position.percentComplete}%` }} />
      </div>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li className={styles.step} data-step-state={step.state} key={step.id}>
            <span aria-hidden="true" className={styles.marker}>
              {step.state === "complete" ? (
                <span className={styles.markerGlyph}>
                  <Icon decorative name="check" size="sm" tone="current" />
                </span>
              ) : (
                index + 1
              )}
            </span>
            <span className={styles.stepBody}>
              <span className={styles.stepTitleRow}>
                <span className={styles.stepTitle}>{step.title}</span>
                <Badge tone={stepStateTone(step.state)}>{stepStateLabel[step.state]}</Badge>
              </span>
              {step.description === undefined ? null : (
                <span className={styles.stepDescription}>{step.description}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
});

Stepper.displayName = "Stepper";

function stepStateTone(state: StepperStepState): "success" | "info" | "neutral" | "critical" {
  switch (state) {
    case "complete":
      return "success";
    case "current":
      return "info";
    case "blocked":
      return "critical";
    case "upcoming":
      return "neutral";
  }
}
