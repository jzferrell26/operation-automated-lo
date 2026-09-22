"use client";

import { forwardRef, type ButtonHTMLAttributes, type SVGProps } from "react";

import styles from "./Icon.module.css";

export type IconName =
  | "home"
  | "users"
  | "megaphone"
  | "chart"
  | "settings"
  | "sparkles"
  | "layers"
  | "search"
  | "arrow-right"
  | "arrow-up-right"
  | "plus"
  | "mail"
  | "calendar"
  | "building"
  | "shield"
  | "credit-card"
  | "download"
  | "file-text"
  | "panel-left"
  | "help"
  | "globe"
  | "image"
  | "bolt"
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
    case "home":
      return (
        <>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v11h14V9M9 20v-7h6v7" />
        </>
      );
    case "users":
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" />
        </>
      );
    case "megaphone":
      return (
        <>
          <path d="m3 10 17-6v16L3 14zM7 15l2 6h4l-2-5M3 10v4" />
        </>
      );
    case "chart":
      return (
        <>
          <path d="M4 3v17h17M8 16v-4M13 16V7M18 16v-7" />
        </>
      );
    case "settings":
      return (
        <>
          <path d="m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
    case "sparkles":
      return (
        <>
          <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4M18 4h4" />
        </>
      );
    case "layers":
      return (
        <>
          <path d="m3 7 9-4 9 4-9 4ZM3 12l9 4 9-4M3 17l9 4 9-4" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      );
    case "arrow-right":
      return <path d="M4 12h16m-6-6 6 6-6 6" />;
    case "arrow-up-right":
      return <path d="M6 18 18 6M6 6h12v12" />;
    case "plus":
      return <path d="M12 5v14M5 12h14" />;
    case "mail":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 6 9 7 9-7" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2" />
        </>
      );
    case "building":
      return (
        <>
          <path d="M4 21V3h12v18M16 11h4v10M2 21h20M8 7h4M8 11h4M8 15h4M9 21v-3h3v3" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
          <path d="m8 12 3 3 5-6" />
        </>
      );
    case "credit-card":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h4" />
        </>
      );
    case "download":
      return <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />;
    case "file-text":
      return (
        <>
          <path d="M14 3H5v18h14V8ZM14 3v5h5M8 12h8M8 16h6" />
        </>
      );
    case "panel-left":
      return (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
        </>
      );
    case "help":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01" />
        </>
      );
    case "globe":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18" />
        </>
      );
    case "image":
      return (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8" cy="8" r="1.5" />
          <path d="m3 17 5-5 4 4 4-6 5 7" />
        </>
      );
    case "bolt":
      return <path d="m13 2-9 12h7l-1 8 10-13h-7Z" />;
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
