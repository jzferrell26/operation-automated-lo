"use client";

import { Button, LiveRegion, Sheet } from "@oalo/ui";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  GUIDED_SETUP_CONTROLS,
  guidedSetupStepAnnouncement,
} from "../../copy/guided-setup-messages.js";
import { userMessageSentence } from "../http/user-messages.js";
import { anchorSelector, type GuidedSetupAnchorId } from "./anchor-registry.js";
import { GuidedSetupProgressTrack } from "./guided-setup-progress.js";
import type { GuidedSetupProgress } from "./model/progress.js";
import {
  resolveAnchorScroll,
  resolvePanelPlacement,
  type PanelPlacement,
  type Rect,
  type Size,
} from "./model/panel-placement.js";
import { PANEL_ANCHORED } from "./steps/step-model.js";
import styles from "./guided-setup.module.css";

/**
 * PRD-006c D6 and D7. The step panel: a non-modal dialog that points at one element at a time.
 *
 * Four decisions shape this component, all of them from D6.
 *
 * - **It does not trap focus.** `aria-modal` is `"false"`, background scroll is never locked, and
 *   Tab leaves the panel for the page. The user has to type into the field the panel is pointing
 *   at, so a trap would make the walkthrough unusable with a keyboard. That is why it is a `Sheet`
 *   and not a `Dialog`: the two primitives differ in exactly this. D6 and 006C-AC-010 ask for the
 *   attribute to be present and false rather than absent, because absent is also what a dialog
 *   whose author forgot looks like.
 * - **Focus moves to the title on open and to the anchored element on continue.** The title is the
 *   sentence that explains what just changed; the anchored element is where the work happens next.
 * - **The highlight is a focus ring, not a scrim.** A dimming overlay changes the contrast of every
 *   word on the page behind it. The ring is the brief's own 2 px at 3 px offset.
 * - **Every step change is announced once**, politely, as "Step n of 7: title".
 *
 * Placement is computed rather than left to the primitive's CSS, for the reason recorded in
 * `model/panel-placement.ts`: a wide or low anchored element pushes a CSS-placed panel off the
 * screen, and the tests for that arithmetic are much cheaper than the browser run that found it.
 */

export type GuidedSetupStepProps = Readonly<{
  anchor: GuidedSetupAnchorId | typeof PANEL_ANCHORED;
  /** The step's body copy. Plain text, because it renders inside the panel's description. */
  body: string;
  /** Anything richer than a sentence: a form, a list of findings, a checklist. */
  children?: ReactNode;
  continueDisabled?: boolean;
  continueLabel?: string;
  /**
   * D6. True only for a Continue that moves the highlight without moving the step, which is step
   * 4's walk along the create screen's fields.
   *
   * D6 asks for two focus movements and they meet here: focus goes to a step's own heading when
   * that step opens, and back to the highlighted element when Continue is pressed. A Continue that
   * opens the next step is the first case, not the second. Until 2026-09-20 it was treated as the
   * second, so pressing "Let's go" on the welcome step put focus on a link in the page behind the
   * panel rather than on the heading of the step that had just appeared, and the announcement a
   * screen reader had just heard named a step the user was no longer in.
   */
  continueStaysOnThisStep?: boolean;
  /**
   * PRD-006d's F-23. True while the dismissal's write is still travelling. The panel stays open,
   * "Not now" is disabled so it cannot be posted twice, and after a beat the panel says why it is
   * still there.
   */
  dismissPending?: boolean;
  onContinue: () => void;
  onDismiss: () => void;
  position: number;
  progress: GuidedSetupProgress;
  title: string;
  /**
   * 006D-AC-011. True when the write this step just made did not land. The panel stays on the
   * step and reads PRD-006b D7's generic sentence out through its own status region; Continue is
   * the retry, so nothing here is disabled.
   */
  writeFailed?: boolean;
}>;

const FOCUSABLE_WITHIN_ANCHOR = "input, select, textarea, button, a[href]";
const SHEET_SELECTOR = '[data-overlay-kind="sheet"]';

/**
 * PRD-006d's F-23. How long a dismissal may take before the panel explains itself.
 *
 * It is not a motion duration and does not come from the motion buckets: nothing moves. It is the
 * length of a pause a person reads as "that worked" rather than "that is broken". Saying it on
 * every dismissal would be noise, because the write usually answers inside this window and the
 * panel simply closes; saying nothing at all would leave a disabled button and no reason.
 */
const DISMISS_ANNOUNCE_AFTER_MS = 400;

/** The element itself when it is a control, otherwise the first control inside it. */
function focusFirstControl(element: HTMLElement): void {
  const focusable = element.matches(FOCUSABLE_WITHIN_ANCHOR)
    ? element
    : element.querySelector<HTMLElement>(FOCUSABLE_WITHIN_ANCHOR);
  focusable?.focus();
}

function rectOf(element: Element): Rect {
  const rect = element.getBoundingClientRect();
  return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
}

function sameSize(left: Size | undefined, right: Size): boolean {
  return (
    left !== undefined &&
    Math.abs(left.width - right.width) < 1 &&
    Math.abs(left.height - right.height) < 1
  );
}

function samePlacement(left: Rect | undefined, right: Rect): boolean {
  return (
    left !== undefined &&
    Math.abs(left.top - right.top) < 1 &&
    Math.abs(left.left - right.left) < 1 &&
    Math.abs(left.width - right.width) < 1 &&
    Math.abs(left.height - right.height) < 1
  );
}

export function GuidedSetupStep({
  anchor,
  body,
  children,
  continueDisabled = false,
  continueLabel = GUIDED_SETUP_CONTROLS.continueLabel,
  continueStaysOnThisStep = false,
  dismissPending = false,
  onContinue,
  onDismiss,
  position,
  progress,
  title,
  writeFailed = false,
}: GuidedSetupStepProps) {
  const [anchorRect, setAnchorRect] = useState<Rect | undefined>(undefined);
  const [panelSize, setPanelSize] = useState<Size | undefined>(undefined);
  const [dismissIsSlow, setDismissIsSlow] = useState(false);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLSpanElement | null>(null);
  /** Set by Continue, consumed by whichever of `attach` or the frame after it runs first. */
  const returnFocusRef = useRef(false);

  const measurePanel = useCallback(() => {
    const panel = layerRef.current?.querySelector(SHEET_SELECTOR);
    if (panel === null || panel === undefined) return;
    const next = rectOf(panel);
    setPanelSize((current) => (sameSize(current, next) ? current : next));
  }, []);

  /**
   * Measuring, highlighting, and scrolling are one effect because they are one fact about one
   * element: splitting them would let the highlight outlive the measurement it came from. The
   * attribute is removed on cleanup, so a step that moves on never leaves a ring behind.
   *
   * The element is often not in the document when the step opens. A step that changes route runs
   * this effect as soon as the panel re-renders, which is before the new page's own components
   * have mounted, so a single `querySelector` finds nothing and the step points at nothing for as
   * long as it is open. The observer is what closes that window: it waits for the element to
   * arrive and then does exactly what the immediate path does.
   *
   * **The observer keeps watching after it has found one.** The page underneath the panel is not
   * this component's to hold still: a re-render of the screen the step points at can replace the
   * element, and the ring, the measurement, and the listeners all belonged to the node that went
   * away. Measured on 2026-09-20 in the review browser run, on the welcome step at 1180x900: the
   * panel had a measured placement and the element carried no ring, so
   * `guided-setup.accessibility.spec.ts` failed waiting fifteen seconds for a highlight that had
   * existed and been thrown away with its node. Staying connected costs one `querySelector` per
   * batch of added or removed nodes, and buys a step that keeps pointing at what it named.
   */
  useEffect(() => {
    if (anchor === PANEL_ANCHORED) {
      setAnchorRect(undefined);
      return;
    }
    const pageAnchor: GuidedSetupAnchorId = anchor;

    let attached: HTMLElement | undefined;
    let update = () => undefined as void;

    /** Lets go of whatever the step was pointing at, ring, listeners, and all. */
    function detach(): void {
      attached?.removeAttribute("data-guided-setup-highlight");
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      attached = undefined;
    }

    function attach(element: HTMLElement): void {
      detach();
      attached = element;
      element.setAttribute("data-guided-setup-highlight", "true");
      update = () => {
        const next = rectOf(element);
        setAnchorRect((current) => (samePlacement(current, next) ? current : next));
        measurePanel();
      };
      // D7. The element is brought into the space the panel is not using before anything is
      // measured, so the numbers the panel is placed from are the ones the user will see.
      const delta = resolveAnchorScroll(rectOf(element), panelSize, {
        height: window.innerHeight,
        width: window.innerWidth,
      });
      if (delta !== 0) window.scrollBy({ behavior: "auto", top: delta });
      update();
      if (returnFocusRef.current) {
        returnFocusRef.current = false;
        focusFirstControl(element);
      }
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);
    }

    function attachIfPresent(): boolean {
      const found = document.querySelector(anchorSelector(pageAnchor));
      if (!(found instanceof HTMLElement) || found === attached) return false;
      window.cancelAnimationFrame(frame);
      attach(found);
      return true;
    }

    const observer = new MutationObserver(() => {
      attachIfPresent();
    });
    // The observer catches an element that arrives with a later render, or one that replaces the
    // element this step is already pointing at. The frame catches one that is already on its way
    // in the same commit, where a mutation may have been recorded before the observer started
    // listening. Between them there is no window in which the step silently points at nothing.
    const frame = window.requestAnimationFrame(() => {
      attachIfPresent();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    if (!attachIfPresent()) setAnchorRect(undefined);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      detach();
    };
    // `panelSize` is deliberately absent: it is an output of this effect, and depending on it
    // would scroll the page again every time the panel's height settled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, measurePanel, position]);

  /** The panel's own size is only knowable after it has rendered, so it is measured every render. */
  useEffect(measurePanel);

  /** D6. Focus lands on the step's own heading, which is what the announcement just named. */
  useEffect(() => {
    titleRef.current?.focus();
  }, [position]);

  /** F-23. The panel only says it is saving once the save has taken longer than a beat. */
  useEffect(() => {
    if (!dismissPending) {
      setDismissIsSlow(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setDismissIsSlow(true);
    }, DISMISS_ANNOUNCE_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [dismissPending]);

  /**
   * D6. Continue hands focus back to the highlighted element, when the step is staying put.
   *
   * Which element that is has to be decided after the highlight has moved, not before. Step 4's
   * Continue advances the panel to the next field, and focusing the one the user just finished
   * would send them backwards every time they pressed it. So the request is recorded, `attach`
   * honours it when the new element arrives, and the frame afterwards handles the case where the
   * element did not change and no attach was going to happen.
   *
   * A Continue that opens the next step hands nothing back. The step that arrives puts focus on
   * its own heading, which is D6's other movement and the one that matters more: the person has
   * just been given a new sentence to read.
   */
  function continueAndReturnFocus() {
    if (anchor === PANEL_ANCHORED || !continueStaysOnThisStep) {
      onContinue();
      return;
    }
    const pageAnchor: GuidedSetupAnchorId = anchor;
    returnFocusRef.current = true;
    onContinue();
    window.requestAnimationFrame(() => {
      if (!returnFocusRef.current) return;
      returnFocusRef.current = false;
      const element = document.querySelector(anchorSelector(pageAnchor));
      if (element instanceof HTMLElement) focusFirstControl(element);
    });
  }

  const placement: PanelPlacement | undefined =
    typeof window === "undefined"
      ? undefined
      : resolvePanelPlacement(anchorRect, panelSize, {
          height: window.innerHeight,
          width: window.innerWidth,
        });

  return (
    <div className={styles.layer} data-guided-setup-layer="true" ref={layerRef}>
      <Sheet
        anchor={placement?.side ?? "block-end"}
        className={styles.panel}
        closeLabel={GUIDED_SETUP_CONTROLS.closeStep}
        data-guided-setup-step={String(position)}
        data-placement={placement === undefined ? "resting" : placement.side}
        description={body}
        footer={
          <>
            <Button disabled={continueDisabled} onClick={continueAndReturnFocus}>
              {continueLabel}
            </Button>
            {/*
              F-23. Disabled only while the dismissal's write is travelling, so the same press
              cannot be posted twice and the panel cannot be closed out from under its own write.
              The reason sits adjacent, in the region below, as the button specification asks.
            */}
            <Button disabled={dismissPending} onClick={onDismiss} variant="secondary">
              {GUIDED_SETUP_CONTROLS.dismiss}
            </Button>
          </>
        }
        onClose={onDismiss}
        open
        style={
          placement === undefined
            ? undefined
            : {
                insetBlockStart: `${String(Math.round(placement.top))}px`,
                insetInlineStart: `${String(Math.round(placement.left))}px`,
                marginBlockStart: 0,
                marginInlineStart: 0,
                position: "fixed",
              }
        }
        title={
          <span ref={titleRef} tabIndex={-1}>
            {title}
          </span>
        }
      >
        <GuidedSetupProgressTrack current={position} progress={progress} />
        {children}
        {/*
          The announcement lives inside the panel, not beside it. Two reasons: a live region on its
          own outside every landmark is content nothing owns, and keeping it in the panel means the
          element persists across step changes, so what a screen reader hears is the text changing
          rather than a region appearing, which is the case that goes unannounced.
        */}
        <LiveRegion message={guidedSetupStepAnnouncement(position, title)} urgency="status" />
        {/*
          F-23's own region. It exists for as long as a dismissal is travelling and it arrives
          empty: the case a screen reader misses is a region that appears already carrying its
          message, so the element is in the document from the moment the control is pressed and
          gains its sentence a beat later, which is a change the region announces. Outside a
          dismissal the panel has exactly one status region, the step announcement above.
        */}
        {dismissPending ? (
          <LiveRegion
            className={styles.pendingNote}
            message={dismissIsSlow ? GUIDED_SETUP_CONTROLS.dismissPending : undefined}
            urgency="status"
            visible={dismissIsSlow}
          />
        ) : null}
        {/*
          006D-AC-011. A write that did not land, in PRD-006b D7's words.

          Status urgency rather than alert: the step is still here, the typing is still here, and
          the same Continue will try again, so this is something to be told rather than something
          to be interrupted for. It is visible as well as announced, because the person who cannot
          hear it is the person about to press Continue and wonder why nothing moved.
        */}
        {writeFailed ? (
          <LiveRegion
            className={styles.pendingNote}
            message={userMessageSentence(undefined)}
            urgency="status"
            visible
          />
        ) : null}
      </Sheet>
    </div>
  );
}
