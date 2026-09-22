"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation.js";
import { Button, Icon, LiveRegion, MODAL_OVERLAY_SELECTOR, Sheet } from "@oalo/ui";
import { useRequiredDashboardPreview } from "./preview-provider.js";
import { productGuides } from "./product-guides.js";
import {
  panelEndRoom,
  resolveAnchorScroll,
  resolvePanelPlacement,
} from "../guided-setup/model/panel-placement.js";
import styles from "./walkthrough.module.css";

export function ProductWalkthrough({ suspended = false }: { suspended?: boolean }) {
  const { state, ready, save } = useRequiredDashboardPreview();
  const path = usePathname();
  const router = useRouter();
  const progress = state.setup.guide;
  const safeReview = /^\/marketing\/campaigns\/campaign_[a-f0-9]{32}$/u.test(path)
    ? path
    : state.setup.campaignRef
      ? `/marketing/campaigns/${state.setup.campaignRef}`
      : "/marketing/campaigns";
  const guides = productGuides(safeReview);
  const guide = progress ? guides[progress.id] : null;
  const index = Math.min(progress?.index ?? 0, (guide?.steps.length ?? 1) - 1);
  const step = guide?.steps[index];
  const [minimized, setMinimized] = useState(false);
  const [closedLocally, setClosedLocally] = useState(false);
  const [failure, setFailure] = useState("");
  const [blockedByDialog, setBlockedByDialog] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | undefined>(undefined);
  const [found, setFound] = useState(false);
  const target = useRef<HTMLElement | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const latest = useRef({ save });
  latest.current = { save };
  const visible =
    ready && !!progress && !progress.paused && !closedLocally && !suspended && !blockedByDialog;
  const samePage = guide?.path === path;
  const pause = useCallback(() => {
    const saved = latest.current.save((current) => ({
      ...current,
      setup: {
        ...current.setup,
        guide: current.setup.guide ? { ...current.setup.guide, paused: true } : null,
      },
    }));
    if (!saved) {
      setClosedLocally(true);
      setFailure("The guide is paused here, but your position could not be saved.");
    }
  }, []);
  useEffect(() => {
    setClosedLocally(false);
    setMinimized(false);
    setFailure("");
  }, [progress?.id, progress?.index, progress?.paused]);
  useEffect(() => {
    const check = () => setBlockedByDialog(document.querySelector(MODAL_OVERLAY_SELECTOR) !== null);
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    check();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || minimized || !step || !samePage) {
      target.current?.removeAttribute("data-guided-setup-highlight");
      target.current = null;
      setFound(false);
      setPosition(undefined);
      return;
    }
    let frame = 0;
    let positioned = false;
    const root = wrapper.current?.closest('[data-product-shell="true"]') as HTMLElement | null;
    const measure = () => {
      const element = document.querySelector<HTMLElement>(step.selector);
      const panel = wrapper.current?.querySelector<HTMLElement>("[data-product-walkthrough]");
      if (!element || !panel) {
        setFound(false);
        setPosition(undefined);
        return;
      }
      if (target.current !== element) {
        target.current?.removeAttribute("data-guided-setup-highlight");
        target.current = element;
        element.setAttribute("data-guided-setup-highlight", "true");
        positioned = false;
      }
      setFound(true);
      const header = document.querySelector("[data-shell-sticky-header]")?.getBoundingClientRect();
      const viewport = { width: innerWidth, height: innerHeight, blockStart: header?.bottom ?? 0 };
      const size = { width: panel.offsetWidth, height: panel.offsetHeight };
      root?.style.setProperty("--product-guide-room", `${panelEndRoom(size, viewport)}px`);
      if (!positioned) {
        positioned = true;
        // Side placement can fit horizontally even when the target is below
        // the visible page. Bring it below the real header before placement.
        const rect = element.getBoundingClientRect();
        const floor = viewport.blockStart + 24;
        if (rect.top < floor || rect.bottom > viewport.height - 24) {
          window.scrollBy({ top: rect.top - floor, behavior: "instant" });
        }
        const delta = resolveAnchorScroll(element.getBoundingClientRect(), size, viewport);
        if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "instant" });
      }
      const candidate = resolvePanelPlacement(element.getBoundingClientRect(), size, viewport);
      const next = candidate
        ? { ...candidate, top: Math.max(candidate.top, viewport.blockStart + 12) }
        : undefined;
      setPosition((previous) =>
        previous?.left === next?.left && previous?.top === next?.top ? previous : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new MutationObserver(schedule);
    const resize = new ResizeObserver(() => {
      positioned = false;
      schedule();
    });
    observer.observe(document.querySelector("main") ?? document.body, {
      childList: true,
      subtree: true,
    });
    const panel = wrapper.current?.querySelector<HTMLElement>("[data-product-walkthrough]");
    if (panel) resize.observe(panel);
    const onResize = () => {
      positioned = false;
      schedule();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", schedule, true);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", schedule, true);
      target.current?.removeAttribute("data-guided-setup-highlight");
      target.current = null;
      root?.style.removeProperty("--product-guide-room");
    };
  }, [visible, minimized, step?.selector, samePage, path]);
  function move(next: number) {
    if (!progress || !guide) return;
    const saved = save((current) => ({
      ...current,
      setup: {
        ...current.setup,
        guide:
          next >= guide.steps.length
            ? null
            : { id: progress.id, index: Math.max(0, next), paused: false },
      },
    }));
    if (!saved) setFailure("Your guide position could not be saved. Please try again.");
  }
  if (!visible || !guide || !step) return failure ? <LiveRegion visible message={failure} /> : null;
  return (
    <div ref={wrapper}>
      {minimized ? (
        <div className={styles.minimized}>
          <Button variant="secondary" onClick={() => setMinimized(false)}>
            <Icon name="help" decorative size="sm" /> Resume walkthrough
          </Button>
          <Button variant="ghost" onClick={pause}>
            Pause
          </Button>
        </div>
      ) : (
        <Sheet
          open
          onClose={pause}
          closeLabel="Pause walkthrough"
          title={step.title}
          className={styles.tour}
          data-product-walkthrough="true"
          style={
            position
              ? { left: position.left, top: position.top, right: "auto", bottom: "auto" }
              : undefined
          }
          footer={
            <div className={styles.footer}>
              <Button variant="ghost" disabled={index === 0} onClick={() => move(index - 1)}>
                Back
              </Button>
              <Button onClick={() => move(index + 1)}>
                {index === guide.steps.length - 1 ? "Finish walkthrough" : "Next"}
                <Icon name="arrow-right" decorative size="sm" />
              </Button>
            </div>
          }
        >
          <div className={styles.stepCounter}>
            {guide.label}{" "}
            <span>
              {index + 1} of {guide.steps.length}
            </span>
          </div>
          <p className={styles.body}>{step.body}</p>
          {!samePage ? (
            <Button variant="outline" onClick={() => router.push(guide.path)}>
              Open {guide.label.toLowerCase()}
            </Button>
          ) : !found ? (
            <p className={styles.missing}>
              This control isn't on screen yet. You can continue to the next tip or return after the
              page is ready.
            </p>
          ) : null}
          <div className={styles.tools}>
            <Button
              variant="ghost"
              disabled={!found}
              onClick={() => {
                const element = target.current;
                const field = element?.matches("input,textarea,button,[tabindex],a")
                  ? element
                  : element?.querySelector<HTMLElement>(
                      'input:not([type="hidden"]),textarea,button:not([disabled]),[tabindex="0"],a',
                    );
                field?.focus({ preventScroll: true });
              }}
            >
              Let me try
            </Button>
            <Button variant="ghost" onClick={() => setMinimized(true)}>
              Minimize
            </Button>
          </div>
          {failure ? <LiveRegion urgency="alert" visible message={failure} /> : null}
        </Sheet>
      )}
    </div>
  );
}
