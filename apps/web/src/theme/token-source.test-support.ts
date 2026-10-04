import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

/**
 * Readers shared by the token tests (PRD-009a, 009A-AC-001 to 005). They read source files only,
 * so the tests run in `pnpm test:unit` on any machine before anything is built.
 */

export type CustomPropertyBlock = Readonly<{
  /** The at-rule chain and selector, outermost first, whitespace collapsed. */
  context: readonly string[];
  declarations: ReadonlyMap<string, string>;
}>;

export function normalizeCssValue(value: string): string {
  return value
    .replaceAll(/\s+/gu, " ")
    .replaceAll(/#[0-9a-f]{3,8}\b/giu, (hex) => hex.toLowerCase())
    .trim();
}

function stripComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//gu, "");
}

/** Every rule block with its custom properties, nested at-rules flattened into `context`. */
export function customPropertyBlocks(
  css: string,
  context: readonly string[] = [],
): readonly CustomPropertyBlock[] {
  const source = stripComments(css);
  const blocks: CustomPropertyBlock[] = [];
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf("{", index);
    if (open === -1) break;
    const prelude = source.slice(index, open).replaceAll(/\s+/gu, " ").trim();
    let depth = 1;
    let cursor = open + 1;
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === "{") depth += 1;
      if (source[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    const body = source.slice(open + 1, cursor - 1);
    if (prelude.startsWith("@")) {
      blocks.push(...customPropertyBlocks(body, [...context, prelude]));
    } else {
      const declarations = new Map<string, string>();
      for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/gu)) {
        const [, name, value] = match;
        if (name !== undefined && value !== undefined) {
          declarations.set(name, normalizeCssValue(value));
        }
      }
      blocks.push({ context: [...context, prelude], declarations });
    }
    index = cursor;
  }
  return blocks;
}

export function readCss(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

/** The custom properties of the one block whose context is exactly `context`. */
export function blockDeclarations(
  css: string,
  context: readonly string[],
): ReadonlyMap<string, string> {
  const matches = customPropertyBlocks(css).filter(
    (block) => block.context.join(" | ") === context.join(" | "),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one block at ${context.join(" | ")}, found ${matches.length}`,
    );
  }
  return matches[0]?.declarations ?? new Map();
}

export const SHIPPED_TOKENS = "packages/ui/src/tokens.css";
export const PRODUCT_TOKENS = "packages/ui/src/product-tokens.css";
export const KNOWLEDGE_TOKENS = "library/knowledge/private/ux-ui/01-master-tokens.css";

export const LIGHT = [":root"] as const;
export const DARK = ['[data-theme="dark"]'] as const;
export const REDUCED_MOTION = ["@media (prefers-reduced-motion: reduce)", ":root"] as const;
export const MIRROR_SYSTEM_DARK = [
  "@media (prefers-color-scheme: dark)",
  ':root:not([data-theme="light"])',
] as const;

export function collectFiles(directory: string, extension: string): readonly string[] {
  return readdirSync(resolve(directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory())
      return entry.name === "node_modules" ? [] : collectFiles(path, extension);
    return extname(entry.name) === extension ? [path] : [];
  });
}

/** Every stylesheet under the two trees 009A-AC-001 and 002 scan. */
export function deliveredStylesheets(): readonly string[] {
  return [...collectFiles("apps/web/src", ".css"), ...collectFiles("packages/ui/src", ".css")];
}

/**
 * The design direction lives with PRD-009, which moves between lifecycle folders
 * (`backlog/`, `in-work/`, `completed/`), so it is found rather than hard-coded.
 */
export function designDirectionPath(): string {
  const candidates = ["backlog", "in-work", "completed"].map((folder) =>
    join("library/requirements", folder, "prd-009-marketing-toolkit/design/00-direction.md"),
  );
  const found = candidates.filter((candidate) => existsSync(resolve(candidate)));
  if (found.length !== 1) {
    throw new Error(
      `Expected the PRD-009 design direction in exactly one of: ${candidates.join(", ")}`,
    );
  }
  return found[0] ?? "";
}

export type DesignTokenRow = Readonly<{
  name: string;
  /** Undefined when the table gives no literal (a new token, or a prose description). */
  oldValue: string | undefined;
  /** The value the token must carry now. Undefined only when neither column is a literal. */
  newValue: string | undefined;
  isNew: boolean;
}>;

function section(markdown: string, heading: string, nextHeading: string): string {
  const start = markdown.indexOf(heading);
  const end = markdown.indexOf(nextHeading, start + heading.length);
  if (start === -1 || end === -1) {
    throw new Error(`Design direction section ${heading} not found`);
  }
  return markdown.slice(start, end);
}

function backticked(cell: string): readonly string[] {
  return [...cell.matchAll(/`([^`]+)`/gu)].map((match) => match[1] ?? "");
}

/** Expands "`--st-success-fg` / `-bg`" into the two full names. */
function tokenNames(cell: string): readonly string[] {
  const names = backticked(cell);
  const first = names[0] ?? "";
  return names.map((name) =>
    name.startsWith("--") ? name : `${first.slice(0, first.lastIndexOf("-"))}${name}`,
  );
}

/** The rows of one token table: `| token | old | new | source or reason |`. */
function tokenRows(table: string): readonly DesignTokenRow[] {
  const rows: DesignTokenRow[] = [];
  for (const line of table.split("\n")) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    const [tokenCell, oldCell, newCell] = cells;
    if (tokenCell === undefined || oldCell === undefined || newCell === undefined) continue;
    if (!tokenCell.startsWith("`--")) continue;
    const names = tokenNames(tokenCell);
    const oldValues = backticked(oldCell);
    const unchanged = /^unchanged$/iu.test(newCell);
    const newValues = unchanged ? oldValues : backticked(newCell);
    names.forEach((name, position) => {
      rows.push({
        name,
        oldValue: oldValues.length === names.length ? oldValues[position] : undefined,
        newValue: newValues.length === names.length ? newValues[position] : undefined,
        isNew: /\(new\)/u.test(oldCell),
      });
    });
  }
  return rows;
}

export function designLightRows(): readonly DesignTokenRow[] {
  const markdown = readFileSync(resolve(designDirectionPath()), "utf8");
  return tokenRows(section(markdown, "### 2.4 ", "### 2.5 "));
}

export function designDarkRows(): readonly DesignTokenRow[] {
  const markdown = readFileSync(resolve(designDirectionPath()), "utf8");
  return tokenRows(section(markdown, "### 2.6 ", "### 2.7 "));
}
