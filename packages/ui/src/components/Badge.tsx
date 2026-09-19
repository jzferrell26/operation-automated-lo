"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { Icon, type IconName } from "./Icon.js";
import { joinClassNames } from "./internal.js";
import "./primitives.css";

export type BadgeTone = "success" | "warning" | "critical" | "info" | "neutral" | "uncertain";

export type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> &
  Readonly<{
    children: ReactNode;
    icon?: IconName | undefined;
    tone?: BadgeTone | undefined;
  }>;

/**
 * Status taxonomy from `03-components/status-feedback-and-attention.md`. Every
 * tone carries a distinct glyph so that status never depends on color alone.
 */
const badgeGlyph: Readonly<Record<BadgeTone, IconName>> = Object.freeze({
  critical: "circle-x",
  info: "info",
  neutral: "circle-dot",
  success: "check",
  uncertain: "loader",
  warning: "alert-triangle",
});

export function getBadgeGlyph(tone: BadgeTone): IconName {
  return badgeGlyph[tone];
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { children, className, icon, tone = "neutral", ...badgeProps },
  ref,
) {
  return (
    <span
      {...badgeProps}
      ref={ref}
      className={joinClassNames("oalo-state-label", className)}
      data-tone={tone}
    >
      <span aria-hidden="true" className="oalo-state-label__glyph">
        <Icon decorative name={icon ?? badgeGlyph[tone]} size="sm" tone="current" />
      </span>
      {children}
    </span>
  );
});

Badge.displayName = "Badge";
