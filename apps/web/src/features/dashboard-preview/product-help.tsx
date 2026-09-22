"use client";

import { usePathname, useRouter } from "next/navigation.js";
import { Button, Dialog, Icon } from "@oalo/ui";
import { guideForPath, setupTasks, type ProductGuideId } from "./setup-model.js";
import { productGuides } from "./product-guides.js";
import { useRequiredDashboardPreview } from "./preview-provider.js";
import styles from "./walkthrough.module.css";

export function ProductHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, save } = useRequiredDashboardPreview();
  const path = usePathname();
  const router = useRouter();
  const reviewPath = /^\/marketing\/campaigns\/campaign_[a-f0-9]{32}$/u.test(path)
    ? path
    : state.setup.campaignRef
      ? `/marketing/campaigns/${state.setup.campaignRef}`
      : "/marketing/campaigns";
  const guides = productGuides(reviewPath);
  const completed = setupTasks(state).filter((step) => step.complete).length;
  function start(id: ProductGuideId, index = 0) {
    if (
      save((current) => ({
        ...current,
        setup: { ...current.setup, welcomeSeen: true, guide: { id, index, paused: false } },
      }))
    ) {
      onClose();
      if (guides[id].path !== path) router.push(guides[id].path);
    }
  }
  return (
    <Dialog
      title="Help & setup"
      description="A little guidance, right where you need it."
      open={open}
      onClose={onClose}
    >
      <div className={styles.helpGrid}>
        <div className={styles.helpSummary}>
          <strong>Your workspace setup</strong>
          <p>{completed} of 7 steps complete. Saved steps and demo records stay on this device.</p>
          <progress aria-label="Setup completion" value={completed} max={7} />
          <Button
            onClick={() => {
              onClose();
              router.push("/onboarding");
            }}
          >
            {state.setup.status === "completed" ? "View my setup" : "Resume setup"}
            <Icon name="arrow-right" decorative size="sm" />
          </Button>
        </div>
        <Button variant="outline" onClick={() => start(guideForPath(path))}>
          {guides[guideForPath(path)].path === path
            ? "Walk me through this page"
            : `Open ${guides[guideForPath(path)].label.toLowerCase()} walkthrough`}
          <Icon name="help" decorative size="sm" />
        </Button>
        {state.setup.guide ? (
          <Button
            variant="outline"
            onClick={() => start(state.setup.guide!.id, state.setup.guide!.index)}
          >
            Resume walkthrough
            <Icon name="arrow-right" decorative size="sm" />
          </Button>
        ) : null}
        <h3>Explore a walkthrough</h3>
        {(Object.keys(guides) as ProductGuideId[])
          .filter((id) => id !== "review" || reviewPath !== "/marketing/campaigns")
          .map((id) => (
            <Button variant="ghost" key={id} onClick={() => start(id)}>
              {guides[id].label}
              <Icon name="arrow-up-right" decorative size="sm" />
            </Button>
          ))}
        <p className={styles.helpNote}>
          Replaying a walkthrough keeps your saved work. Each tip shows you where to go; you decide
          when to save, approve, or make changes.
        </p>
      </div>
    </Dialog>
  );
}
