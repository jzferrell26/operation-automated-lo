"use client";

import { Button, LiveRegion, Sheet } from "@oalo/ui";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  GUIDED_SETUP_CONTROLS,
  guidedSetupStepAnnouncement,
} from "../../copy/guided-setup-messages.js";
import type { InternalRefusal } from "../http/internal-api.js";
import { userMessageSentence } from "../http/user-messages.js";
import { SupportReference } from "../shell/components/support-details.js";
import { anchorSelector, type GuidedSetupAnchorId } from "./anchor-registry.js";
import { GuidedSetupProgressTrack } from "./guided-setup-progress.js";
import type { GuidedSetupProgress } from "./model/progress.js";
import {
  panelEndRoom,
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
   * 006D-AC-011, through PRD-006b D7. The refusal the write this step just made came back with,
   * or `undefined` when nothing has gone wrong.
   *
   * The panel stays on the step and reads the refusal's own sentence out through its status
   * region, plus the support reference when the code has no sentence of its own. Continue is the
   * retry, so nothing here is disabled.
   */
  writeFailure?: InternalRefusal | undefined;
}>;

const FOCUSABLE_WITHIN_ANCHOR = "input, select, textarea, button, a[href]";
const SHEET_SELECTOR = '[data-overlay-kind="sheet"]';

/**
 * PRD-006c D7, Wave 7r. The room the open panel asks the page for, published for the shell.
 *
 * The walkthrough cannot reach into the shell's layout and the shell knows nothing about the
 * walkthrough, which is the arrangement `app-shell.tsx` keeps deliberately: it takes the chip and
 * the help menu as a slot rather than importing them. So the number crosses as a custom property
 * on the document element, which `app-shell.module.css` reads into the main landmark's end
 * padding. It is set only while a step is open and removed on cleanup, so a page with no
 * walkthrough on it, or one whose walkthrough has been dismissed or completed, falls back to the
 * `0px` in the stylesheet's own `var()` and nothing about its layout moves.
 */
const PANEL_ROOM_PROPERTY = "--guided-setup-panel-room";

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

/**
 * D7. How much of the viewport's block start the shell's sticky header is holding.
 *
 * The element is found by the attribute the shell puts on its own topbar rather than by a class
 * name or a tag, so a screen without that chrome, such as a server render or a test harness,
 * simply answers zero. A header that is not actually pinned is not in the way, so its position is
 * read before its height is believed.
 */
function stickyHeaderInset(): number {
  const header = document.querySelector<HTMLElement>("[data-shell-sticky-header]");
  if (header === null) return 0;
  const { position } = window.getComputedStyle(header);
  if (position !== "sticky" && position !== "fixed") return 0;
  return header.getBoundingClientRect().height;
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
  writeFailure,
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
   * D7. The page gains room at its end for the panel, so the scroll below has somewhere to go.
   *
   * **It is declared before the effect that scrolls, and that is the whole point.** React runs
   * passive effects in declaration order within a commit, and `window.scrollBy` is clamped to the
   * document's height at the instant it runs. An effect that added the room after the scroll would
   * hand the scroll a page that was still too short, which is the defect this is here to fix.
   * `panelEndRoom` answers the stylesheet's cap whether or not the panel has been measured, so the
   * room is already at full size on the first commit of a step and never narrows afterwards.
   *
   * The resize listener is the step's own, separate from the one `attach` installs, because three
   * of the seven steps render their form inside the panel and never attach to a page element at
   * all, and the room is a fact about the frame rather than about an element.
   */
  useEffect(() => {
    const root = document.documentElement;
    function apply(): void {
      const room = panelEndRoom(panelSize, {
        height: window.innerHeight,
        width: window.innerWidth,
      });
      root.style.setProperty(PANEL_ROOM_PROPERTY, `${String(Math.round(room))}px`);
    }
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.removeProperty(PANEL_ROOM_PROPERTY);
    };
  }, [panelSize]);

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
   * Wave 7n. The observer keeps watching for as long as the step is open, rather than stopping the
   * moment it has attached. An element that arrives once can also be replaced: a screen remounts
   * the card or the field the step points at, and the ring stays on a node that is no longer in
   * the document while the replacement carries nothing. The step then points at nothing, with
   * nothing to say so, which is what `guided-setup.accessibility.spec.ts` was failing on at a cell
   * that moved between runs. Re-querying costs one attribute selector and only happens once the
   * element it attached to has actually left the document.
   * Wave 7p measured the same defect on 2026-09-20 in the review browser run, on the welcome
   * step at 1180x900: the panel had a measured placement and the element carried no ring, so
   * `guided-setup.accessibility.spec.ts` waited fifteen seconds for a highlight that had existed
   * and been thrown away with its node.
   */
  useEffect(() => {
    if (anchor === PANEL_ANCHORED) {
      setAnchorRect(undefined);
      return;
    }
    const pageAnchor: GuidedSetupAnchorId = anchor;

    let attached: HTMLElement | undefined;
    let update = () => undefined as void;

    /**
     * Lets go of the element the ring is on, without touching the placement it was measured from.
     *
     * The rect is deliberately left alone. Between a remount and the render that replaces the
     * element there is no anchor at all, and clearing it there would drop the panel back to its
     * resting placement for a frame and then move it again, which is a jump a person would see for
     * no reason. The panel stays where it is and the next attach re-measures.
     */
    let layoutObserver: ResizeObserver | undefined;
    let settleAttached = () => undefined as void;

    function detach(): void {
      if (attached === undefined) return;
      attached.removeAttribute("data-guided-setup-highlight");
      window.removeEventListener("resize", settleAttached);
      window.removeEventListener("scroll", update, true);
      layoutObserver?.disconnect();
      layoutObserver = undefined;
      attached = undefined;
      update = () => undefined as void;
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
      const settle = (): void => {
        const delta = resolveAnchorScroll(rectOf(element), panelSize, {
          blockStart: stickyHeaderInset(),
          height: window.innerHeight,
          width: window.innerWidth,
        });
        if (delta !== 0) window.scrollBy({ behavior: "auto", top: delta });
        update();
      };
      settleAttached = settle;
      settle();
      if (returnFocusRef.current) {
        returnFocusRef.current = false;
        focusFirstControl(element);
      }
      // A frame change is a placement change: the element is brought clear again, not only
      // re-measured, which is what D7 promises whatever size the window has just become.
      window.addEventListener("resize", settleAttached);
      window.addEventListener("scroll", update, true);
      /**
       * The scroll above is right for the layout at the instant of the attach, and the layout is
       * not finished then: a font swap, a late card, or the room this step adds at the page's end
       * moves the element after the fact, and a scroll that was correct a frame ago leaves it under
       * the panel. Measured on 2026-09-21 by the runner's comparison of step 6 at 1440: the same
       * tree gave two pictures, one with the approve card scrolled clear and one with it under the
       * panel, depending on whether the layout had finished when the step attached. The observer
       * re-runs the same scroll whenever the element or the document changes size; the scroll asks
       * for zero once the element is clear, so it converges and never fights a person's own scroll,
       * which changes no size.
       */
      if (typeof ResizeObserver === "function") {
        layoutObserver = new ResizeObserver(() => {
          settle();
        });
        layoutObserver.observe(element);
        layoutObserver.observe(document.body);
      }
    }

    function attachIfPresent(): boolean {
      const found = document.querySelector(anchorSelector(pageAnchor));
      if (!(found instanceof HTMLElement) || found === attached) return false;
      detach();
      attach(found);
      return true;
    }

    const observer = new MutationObserver(() => {
      // The ring is already on an element the page still holds, so there is nothing to look for.
      // The registry keeps one element per anchor id, so an element that is still in the document
      // is still the element this step names.
      if (attached !== undefined && attached.isConnected) return;
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
        {writeFailure === undefined ? null : (
          <LiveRegion
            className={styles.pendingNote}
            message={
              <>
                <span>{userMessageSentence(writeFailure.code)}</span>
                <SupportReference refusal={writeFailure} />
              </>
            }
            urgency="status"
            visible
          />
        )}
      </Sheet>
    </div>
  );
}
