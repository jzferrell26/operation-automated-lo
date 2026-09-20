"use client";

import { useEffect, useId, useRef, type HTMLAttributes, type ReactNode } from "react";

import { IconButton } from "./Icon.js";
import { joinClassNames } from "./internal.js";

import styles from "./overlay.module.css";

export type OverlayAnchor = "inline-end" | "block-end";
export type DialogSize = "sm" | "md";

/**
 * The elements a dismissable layer may move focus between. Keeping one selector
 * here is what makes the `Dialog` trap and the `Sheet` entry point agree.
 */
export const OVERLAY_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Pure focus-wrap policy shared by the layer and its focused contract tests.
 * It returns the element that must receive focus, or `null` when the browser's
 * own sequential navigation already lands inside the layer.
 */
export function resolveTabTarget(
  order: readonly HTMLElement[],
  active: Element | null,
  backwards: boolean,
): HTMLElement | null {
  const first = order.at(0);
  const last = order.at(-1);

  if (first === undefined || last === undefined) {
    return null;
  }

  if (backwards) {
    return active === first ? last : null;
  }

  return active === last ? first : null;
}

function focusableWithin(panel: HTMLElement | null): readonly HTMLElement[] {
  return panel === null
    ? []
    : Array.from(panel.querySelectorAll<HTMLElement>(OVERLAY_FOCUSABLE_SELECTOR));
}

type DismissableLayerOptions = Readonly<{
  modal: boolean;
  onClose: () => void;
  open: boolean;
  panelRef: { current: HTMLDivElement | null };
}>;

/**
 * Moves focus into the layer on open, keeps Tab inside a modal layer, closes on
 * Escape, restores focus to the opener on close, and locks background scroll for
 * a modal layer only. The layer never hides the rest of the page from assistive
 * technology, so nothing has to be unhidden when it closes: a modal layer relies
 * on `aria-modal="true"` plus the focus trap instead. A non-modal layer carries
 * `aria-modal="false"` rather than no attribute at all, so that a panel which
 * deliberately leaves the page reachable is distinguishable from one whose author
 * forgot to say (PRD-006c D6, 006C-AC-010).
 */
function useDismissableLayer({ modal, onClose, open, panelRef }: DismissableLayerOptions) {
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        openerRef.current?.focus();
        openerRef.current = null;
      }
      return;
    }

    wasOpenRef.current = true;
    openerRef.current = document.activeElement as HTMLElement | null;
    focusableWithin(panelRef.current).at(0)?.focus();

    const priorOverflow = document.body.style.overflow;
    if (modal) {
      document.body.style.overflow = "hidden";
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modal) {
        return;
      }

      const target = resolveTabTarget(
        focusableWithin(panelRef.current),
        document.activeElement,
        event.shiftKey,
      );

      if (target !== null) {
        event.preventDefault();
        target.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (modal) {
        document.body.style.overflow = priorOverflow;
      }
    };
  }, [modal, onClose, open, panelRef]);
}

type LayerBaseProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "role" | "title"> &
  Readonly<{
    children: ReactNode;
    closeLabel?: string | undefined;
    description?: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    open: boolean;
    title: ReactNode;
  }>;

export type DialogProps = LayerBaseProps &
  Readonly<{
    size?: DialogSize | undefined;
    urgent?: boolean | undefined;
  }>;

export type SheetProps = LayerBaseProps &
  Readonly<{
    anchor?: OverlayAnchor | undefined;
  }>;

type LayerProps = LayerBaseProps &
  Readonly<{
    modal: boolean;
    panelClassName: string | undefined;
    panelData: Readonly<Record<string, string>>;
    role: "dialog" | "alertdialog";
  }>;

/** One implementation for both layers, so their focus contract cannot drift. */
function Layer({
  children,
  className,
  closeLabel = "Close",
  description,
  footer,
  modal,
  onClose,
  open,
  panelClassName,
  panelData,
  role,
  title,
  ...layerProps
}: LayerProps) {
  const generatedId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDismissableLayer({ modal, onClose, open, panelRef });

  if (!open) {
    return null;
  }

  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const hasDescription = description !== undefined && description !== null;

  const panel = (
    <div
      {...layerProps}
      {...panelData}
      ref={panelRef}
      aria-describedby={hasDescription ? descriptionId : undefined}
      aria-labelledby={titleId}
      aria-modal={modal ? "true" : "false"}
      className={joinClassNames(panelClassName, className)}
      role={role}
    >
      <div className={styles.header}>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        <IconButton icon="x" label={closeLabel} onClick={onClose} />
      </div>
      {hasDescription ? (
        <p className={styles.description} id={descriptionId}>
          {description}
        </p>
      ) : null}
      <div className={styles.body}>{children}</div>
      {footer === undefined ? null : <div className={styles.footer}>{footer}</div>}
    </div>
  );

  return modal ? (
    <div className={styles.overlay} data-overlay-kind="dialog">
      {panel}
    </div>
  ) : (
    panel
  );
}

/**
 * The modal layer. It generalises the confirmation behaviour that `SafeAction`
 * implements inline: focus moves in, Escape closes, focus returns to the
 * opener, and the background cannot be reached with Tab while it is open.
 */
export function Dialog({ size = "md", urgent = false, ...dialogProps }: DialogProps) {
  return (
    <Layer
      {...dialogProps}
      modal
      panelClassName={styles.panel}
      panelData={{ "data-overlay-kind": "dialog", "data-panel-size": size }}
      role={urgent ? "alertdialog" : "dialog"}
    />
  );
}

Dialog.displayName = "Dialog";

/**
 * The non-modal layer: an anchored panel on wide frames and a bottom sheet at
 * the mobile frame. The page behind it stays operable, so background scroll is
 * never locked and Tab is never trapped.
 */
export function Sheet({ anchor = "inline-end", ...sheetProps }: SheetProps) {
  return (
    <Layer
      {...sheetProps}
      modal={false}
      panelClassName={joinClassNames(styles.panel, styles.sheet)}
      panelData={{ "data-anchor": anchor, "data-overlay-kind": "sheet" }}
      role="dialog"
    />
  );
}

Sheet.displayName = "Sheet";

export type SheetAnchorProps = HTMLAttributes<HTMLDivElement>;

/** Positioning context for an anchored `Sheet`. */
export function SheetAnchor({ className, ...anchorProps }: SheetAnchorProps) {
  return <div {...anchorProps} className={joinClassNames(styles.sheetAnchor, className)} />;
}

SheetAnchor.displayName = "SheetAnchor";
