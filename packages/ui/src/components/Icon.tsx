"use client";

import { forwardRef, type ButtonHTMLAttributes, type SVGProps } from "react";

import styles from "./Icon.module.css";

export type IconName =
  | "alert-triangle"
  | "check"
  | "chevron-down"
  | "circle-dot"
  | "circle-x"
  | "clock"
  | "external-link"
  | "eye"
  | "eye-off"
  | "info"
  | "loader"
  | "lock"
  | "menu"
  | "monitor"
  | "moon"
  | "sun"
  | "x";

export type IconSize = "sm" | "md" | "lg";
export type IconTone =
  | "current"
  | "critical"
  | "info"
  | "navigation"
  | "neutral"
  | "primary"
  | "success"
  | "uncertain"
  | "warning";

type IconAccessibility =
  Readonly<{ decorative?: true; label?: never }> | Readonly<{ decorative: false; label: string }>;

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children" | "height" | "width"> &
  IconAccessibility & {
    readonly name: IconName;
    readonly size?: IconSize;
    readonly tone?: IconTone;
  };

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function IconGeometry({ name }: Readonly<{ name: IconName }>) {
  switch (name) {
    case "alert-triangle":
      return (
        <>
          <path d="M21.7 18 13.7 4a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      );
    case "check":
      return <path d="m5 12 4 4L19 6" />;
    case "chevron-down":
      return <path d="m6 9 6 6 6-6" />;
    case "circle-dot":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="1" />
        </>
      );
    case "circle-x":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6" />
          <path d="m15 9-6 6" />
        </>
      );
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
    case "external-link":
      return (
        <>
          <path d="M14 5h5v5" />
          <path d="m10 14 9-9" />
          <path d="M19 14v5H5V5h5" />
        </>
      );
    case "eye":
      return (
        <>
          <path d="M2.2 12a10.6 10.6 0 0 1 19.6 0 10.6 10.6 0 0 1-19.6 0Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
    case "eye-off":
      return (
        <>
          <path d="M10.7 6.2A10.6 10.6 0 0 1 21.8 12a10.7 10.7 0 0 1-3.4 4.1" />
          <path d="M6.5 6.6A10.7 10.7 0 0 0 2.2 12a10.6 10.6 0 0 0 12.4 5.6" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          <path d="m3 3 18 18" />
        </>
      );
    case "info":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </>
      );
    case "loader":
      return (
        <>
          <path d="M21 12a9 9 0 1 1-5.3-8.2" />
          <path d="M21 3v6h-6" />
        </>
      );
    case "lock":
      return (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      );
    case "menu":
      return (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      );
    case "monitor":
      return (
        <>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </>
      );
    case "moon":
      return <path d="M20.8 15.2A9 9 0 0 1 8.8 3.2 9 9 0 1 0 20.8 15.2Z" />;
    case "sun":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.9 4.9 1.4 1.4" />
          <path d="m17.7 17.7 1.4 1.4" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.3 17.7-1.4 1.4" />
          <path d="m19.1 4.9-1.4 1.4" />
        </>
      );
    case "x":
      return (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </>
      );
  }
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { className, decorative = true, label, name, size = "md", tone = "current", ...svgProps },
  ref,
) {
  const semantic = decorative === false;

  return (
    <svg
      {...svgProps}
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className={classNames(styles.icon, styles[size], styles[tone], className)}
      role={semantic ? "img" : undefined}
      aria-label={semantic ? label : undefined}
      aria-hidden={semantic ? undefined : true}
      focusable="false"
    >
      <IconGeometry name={name} />
    </svg>
  );
});

Icon.displayName = "Icon";

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  readonly icon: IconName;
  readonly label: string;
  readonly pressed?: boolean;
  readonly tone?: IconTone;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    className,
    disabled = false,
    icon,
    label,
    pressed,
    tone = "current",
    type = "button",
    ...buttonProps
  },
  ref,
) {
  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      className={classNames(styles.iconButton, className)}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      <Icon name={icon} size="md" tone={tone} decorative />
    </button>
  );
});

IconButton.displayName = "IconButton";
