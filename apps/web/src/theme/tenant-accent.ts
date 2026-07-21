export type TenantAccentPair = Readonly<{
  action: string;
  actionHover: string;
  onAction: string;
}>;

export type TenantAccentDefinition = Readonly<{
  dark: TenantAccentPair;
  light: TenantAccentPair;
}>;

export const DEFAULT_TENANT_ACCENT_KEY = "oalo-default";
export const TEAL_TENANT_ACCENT_KEY = "oalo-teal";

const semanticTenantAccentCatalog = Object.freeze({
  [DEFAULT_TENANT_ACCENT_KEY]: Object.freeze({
    light: Object.freeze({
      action: "#2f6fed",
      actionHover: "#1f4bb8",
      onAction: "#ffffff",
    }),
    dark: Object.freeze({
      action: "#3566d6",
      actionHover: "#2f5dc7",
      onAction: "#ffffff",
    }),
  }),
  [TEAL_TENANT_ACCENT_KEY]: Object.freeze({
    light: Object.freeze({
      action: "#087f5b",
      actionHover: "#056c4c",
      onAction: "#ffffff",
    }),
    dark: Object.freeze({
      action: "#5ee0aa",
      actionHover: "#46c98f",
      onAction: "#07111f",
    }),
  }),
} satisfies Record<string, TenantAccentDefinition>);

export type TenantAccentKey = keyof typeof semanticTenantAccentCatalog;

export type TenantAccentValidation =
  | Readonly<{ valid: true; value: TenantAccentDefinition }>
  | Readonly<{ valid: false; reason: string }>;

type TenantAccentPairValidation =
  Readonly<{ valid: true; value: TenantAccentPair }> | Readonly<{ valid: false; reason: string }>;

export type TenantAccentCssVariables = Readonly<{
  "--tenant-accent-dark-action": string;
  "--tenant-accent-dark-action-hover": string;
  "--tenant-accent-dark-on-action": string;
  "--tenant-accent-light-action": string;
  "--tenant-accent-light-action-hover": string;
  "--tenant-accent-light-on-action": string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, expectedKeys: ReadonlyArray<string>): boolean {
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length && keys.every((key) => expectedKeys.includes(key));
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function parseHexColor(value: string): Readonly<[number, number, number]> {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function relativeLuminance(color: string): number {
  const channels = parseHexColor(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  const [red, green, blue] = channels;
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function validateAccentPair(value: unknown, mode: "light" | "dark"): TenantAccentPairValidation {
  if (!isRecord(value) || !hasOnlyKeys(value, ["action", "actionHover", "onAction"])) {
    return {
      valid: false,
      reason: `${mode} accent must contain exactly action, actionHover, and onAction.`,
    };
  }

  if (!isHexColor(value.action) || !isHexColor(value.actionHover) || !isHexColor(value.onAction)) {
    return { valid: false, reason: `${mode} accent values must be six-digit hex colors.` };
  }

  if (contrastRatio(value.onAction, value.action) < 4.5) {
    return { valid: false, reason: `${mode} action contrast must meet WCAG AA.` };
  }

  if (contrastRatio(value.onAction, value.actionHover) < 4.5) {
    return { valid: false, reason: `${mode} action hover contrast must meet WCAG AA.` };
  }

  return {
    valid: true,
    value: {
      action: value.action,
      actionHover: value.actionHover,
      onAction: value.onAction,
    },
  };
}

/**
 * Validates a server-owned accent definition before it can enter the compiled
 * tenant allowlist. The browser receives only a known data attribute, never
 * tenant-provided selectors, styles, or CSS variable names.
 */
export function validateTenantAccent(value: unknown): TenantAccentValidation {
  if (!isRecord(value) || !hasOnlyKeys(value, ["light", "dark"])) {
    return { valid: false, reason: "Tenant accent must contain complete light and dark pairs." };
  }

  const light = validateAccentPair(value.light, "light");
  if (!light.valid) {
    return light;
  }

  const dark = validateAccentPair(value.dark, "dark");
  if (!dark.valid) {
    return dark;
  }

  return { valid: true, value: { light: light.value, dark: dark.value } };
}

function isTenantAccentKey(value: string): value is TenantAccentKey {
  return Object.hasOwn(semanticTenantAccentCatalog, value);
}

/**
 * This is the server boundary for a tenant selection. Unknown values receive
 * the approved default instead of reaching the DOM as a custom selector.
 */
export function resolveServerTenantAccentKey(value: unknown): TenantAccentKey {
  if (typeof value === "string" && isTenantAccentKey(value)) {
    return value;
  }

  return DEFAULT_TENANT_ACCENT_KEY;
}

export function getTenantAccent(key: TenantAccentKey): TenantAccentDefinition {
  return semanticTenantAccentCatalog[key];
}

/** Produces fixed semantic values from an already validated server catalog key. */
export function getTenantAccentCssVariables(key: TenantAccentKey): TenantAccentCssVariables {
  const accent = getTenantAccent(key);

  return {
    "--tenant-accent-light-action": accent.light.action,
    "--tenant-accent-light-action-hover": accent.light.actionHover,
    "--tenant-accent-light-on-action": accent.light.onAction,
    "--tenant-accent-dark-action": accent.dark.action,
    "--tenant-accent-dark-action-hover": accent.dark.actionHover,
    "--tenant-accent-dark-on-action": accent.dark.onAction,
  };
}
