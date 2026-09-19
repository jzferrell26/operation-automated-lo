"use client";

import { Button, Stepper, type StepperStep } from "@oalo/ui";
import { useEffect, useRef, useState } from "react";

import { GUIDED_SETUP_CONTROLS } from "../../copy/guided-setup-messages.js";
import { GUIDED_SETUP_ANCHORS } from "./anchor-registry.js";
import { useGuidedSetup } from "./guided-setup-context.js";
import { isStepComplete, type GuidedSetupProgress } from "./model/progress.js";
import { GUIDED_SETUP_STEP_DEFINITIONS } from "./steps/step-model.js";
import styles from "./guided-setup.module.css";

/**
 * PRD-006c D3 and D5. Where the user is, and the two ways back in.
 *
 * `GuidedSetupProgressTrack` is the `Stepper` primitive projected from stored progress. It is
 * inside the panel rather than beside it, so the answer to "how much is left" is in the same place
 * as the question.
 *
 * `GuidedSetupShellControls` is the shell's half: the "Finish setup" chip, which exists only while
 * a dismissed setup is inside its seven-day window, and the help menu, which is the way back after
 * that window closes and the way to start again once the setup is finished.
 */

export function GuidedSetupProgressTrack({
  current,
  progress,
}: Readonly<{ current: number; progress: GuidedSetupProgress }>) {
  const steps: readonly StepperStep[] = GUIDED_SETUP_STEP_DEFINITIONS.map((step) => ({
    id: `guided-setup-step-${String(step.position)}`,
    title: step.title,
    state: stepState(step.position, current, progress),
  }));
  return <Stepper label="Guided setup progress" steps={steps} />;
}

function stepState(
  position: number,
  current: number,
  progress: GuidedSetupProgress,
): StepperStep["state"] {
  if (position === current) return "current";
  return isStepComplete(progress, position) ? "complete" : "upcoming";
}

/**
 * The help menu is a disclosure, not a navigation landmark: one button, one list, Escape to close,
 * focus back to the button. It is built by hand rather than from a primitive because the design
 * system has no menu, and inventing one here would be a component nobody else reviews.
 */
export function GuidedSetupShellControls() {
  const setup = useGuidedSetup();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!helpOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setHelpOpen(false);
      helpButtonRef.current?.focus();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [helpOpen]);

  if (setup === undefined || !setup.enabled) return null;

  return (
    <div className={styles.shellSlot}>
      {setup.showFinishChip ? (
        <Button
          data-tour={GUIDED_SETUP_ANCHORS.shellFinishSetupChip}
          onClick={() => {
            setup.resumeSetup();
          }}
          size="sm"
          variant="secondary"
        >
          {GUIDED_SETUP_CONTROLS.finishChip}
        </Button>
      ) : null}
      <div className={styles.helpMenu}>
        <Button
          aria-expanded={helpOpen}
          aria-haspopup="true"
          data-tour={GUIDED_SETUP_ANCHORS.shellHelpMenu}
          onClick={() => {
            setHelpOpen((open) => !open);
          }}
          ref={helpButtonRef}
          size="sm"
          variant="ghost"
        >
          Help
        </Button>
        {helpOpen ? (
          <ul aria-label="Help" className={styles.helpMenuList}>
            <li>
              <Button
                onClick={() => {
                  setHelpOpen(false);
                  setup.restartSetup();
                }}
                size="sm"
                variant="ghost"
              >
                {GUIDED_SETUP_CONTROLS.restart}
              </Button>
            </li>
          </ul>
        ) : null}
      </div>
    </div>
  );
}
