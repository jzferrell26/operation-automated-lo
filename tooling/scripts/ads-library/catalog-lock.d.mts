/** PRD-009c 009C-AC-002. The append-only lock of an ads library catalog. */

export interface CatalogLockLine {
  readonly id: string;
  readonly version: number;
  readonly tallSha256: string;
  readonly squareSha256: string;
  readonly defaultsSha256: string;
  readonly headlineMaxLength: number;
  readonly primaryTextMaxLength: number;
}

export interface LockableEntry {
  readonly id: string;
  readonly version: number;
  readonly images: Readonly<{
    tall: Readonly<{ sha256: string }>;
    square: Readonly<{ sha256: string }>;
  }>;
  readonly defaults: Readonly<{ headline: string; primaryText: string }>;
  readonly editable: Readonly<{
    headline: Readonly<{ maxLength: number }>;
    primaryText: Readonly<{ maxLength: number }>;
  }>;
}

export function defaultsDigest(defaults: LockableEntry["defaults"]): string;
export function lockLineFor(entry: LockableEntry): CatalogLockLine;
export function lockProblems(
  lock: readonly CatalogLockLine[],
  entries: readonly LockableEntry[],
): string[];
export function lockRewrites(
  baseLock: readonly CatalogLockLine[],
  currentLock: readonly CatalogLockLine[],
): string[];
export function appendLockLines(
  lock: readonly CatalogLockLine[],
  entries: readonly LockableEntry[],
): CatalogLockLine[];
export function formatJson(value: unknown, filePath: string): Promise<string>;
