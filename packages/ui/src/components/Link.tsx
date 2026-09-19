"use client";

import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

import { Icon } from "./Icon.js";
import { joinClassNames } from "./internal.js";
import "./primitives.css";

import styles from "./link.module.css";

export type LinkVariant = "inline" | "action";

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "rel" | "target"> &
  Readonly<{
    children: ReactNode;
    external?: boolean | undefined;
    newTabLabel?: string | undefined;
    variant?: LinkVariant | undefined;
  }>;

export type ExternalLinkSafety = Readonly<{
  rel: string | undefined;
  target: string | undefined;
}>;

/**
 * Pure safety policy shared by the control and its focused contract tests.
 * An external destination always opens with `noopener noreferrer` so the opened
 * document can never reach back into the workspace session.
 */
export function resolveExternalLinkSafety(external: boolean): ExternalLinkSafety {
  return external
    ? { rel: "noopener noreferrer", target: "_blank" }
    : { rel: undefined, target: undefined };
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    children,
    className,
    external = false,
    newTabLabel = "opens in a new tab",
    variant = "inline",
    ...anchorProps
  },
  ref,
) {
  const safety = resolveExternalLinkSafety(external);

  return (
    <a
      {...anchorProps}
      ref={ref}
      className={joinClassNames(styles.link, styles[variant], className)}
      data-variant={variant}
      rel={safety.rel}
      target={safety.target}
    >
      {children}
      {external ? (
        <>
          <span className={styles.glyph}>
            <Icon decorative name="external-link" size="sm" />
          </span>
          <span className="oalo-visually-hidden">{newTabLabel}</span>
        </>
      ) : null}
    </a>
  );
});

Link.displayName = "Link";
