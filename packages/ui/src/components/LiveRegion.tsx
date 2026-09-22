"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { joinClassNames } from "./internal.js";
import "./primitives.css";

export type LiveRegionUrgency = "status" | "alert";

export type LiveRegionAnnouncement = Readonly<{
  "aria-atomic": "true";
  "aria-live": "polite" | "assertive";
  role: LiveRegionUrgency;
}>;

export type LiveRegionProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "aria-atomic" | "aria-live" | "children" | "role"
> &
  Readonly<{
    message?: ReactNode;
    urgency?: LiveRegionUrgency | undefined;
    visible?: boolean | undefined;
  }>;

/**
 * Pure announcement policy shared by the control and its focused contract
 * tests. `status` never interrupts; `alert` does, and is reserved for a failed
 * submission or a blocked provider result.
 */
export function resolveAnnouncement(urgency: LiveRegionUrgency): LiveRegionAnnouncement {
  return {
    "aria-atomic": "true",
    "aria-live": urgency === "alert" ? "assertive" : "polite",
    role: urgency,
  };
}

export const LiveRegion = forwardRef<HTMLDivElement, LiveRegionProps>(function LiveRegion(
  { className, message, urgency = "status", visible = false, ...regionProps },
  ref,
) {
  const announcement = resolveAnnouncement(urgency);

  return (
    <div
      {...regionProps}
      {...announcement}
      ref={ref}
      className={joinClassNames(
        "oalo-live-region",
        visible ? undefined : "oalo-visually-hidden",
        className,
      )}
      data-live-urgency={urgency}
    >
      {message}
    </div>
  );
});

LiveRegion.displayName = "LiveRegion";
