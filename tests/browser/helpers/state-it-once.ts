import { expect, type Page } from "@playwright/test";

import {
  CONNECTION_SHAPES,
  KNOWN_CONNECTION_SENTENCES,
  connectionStatementsInDocument,
  type StatedConnection,
} from "./connection-statements-in-page.js";

/**
 * PRD-009g D2 and 009G-AC-009, "stated once", for the browser suites. What counts as a connection
 * sentence, and why the known ones are read from the copy files, is written in
 * `connection-statements-in-page.ts`, which also holds the function this evaluates in the page.
 *
 * It is the browser half of `apps/web/src/features/overview/components/connection-statements.test-support.ts`,
 * which reads a rendered component in jsdom. `page.evaluate` serialises the function it is given, so
 * the algorithm cannot be imported from there, and
 * `tooling/tests/integration/review-browser/state-it-once.test.ts` runs both against the same
 * documents and fails the day they read different things.
 */

export type { StatedConnection } from "./connection-statements-in-page.js";

/** Every connection sentence a person can read on the page now, in document order. */
export async function readConnectionStatements(page: Page): Promise<readonly StatedConnection[]> {
  return page.evaluate(connectionStatementsInDocument, {
    known: [...KNOWN_CONNECTION_SENTENCES],
    shapes: [...CONNECTION_SHAPES],
  });
}

/** The keys that appear more than once, with how many times, which is what "state it once" forbids. */
export function repeatedStatements(statements: readonly StatedConnection[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const statement of statements) {
    counts.set(statement.key, (counts.get(statement.key) ?? 0) + 1);
  }
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => `${key} (said ${String(count)} times)`);
}

/** The statements that are not inside the "Get set up" card, which is where Home says them all. */
export function statementsOutsideTheSetupCard(
  statements: readonly StatedConnection[],
): readonly string[] {
  return statements
    .filter((statement) => !statement.insideSetupCard)
    .map((statement) => statement.text);
}

/**
 * 009G-AC-009. D2 on the page that is open: no connection sentence is said twice, and on Home every
 * one is inside "Get set up". The page's own address says which rule applies, so a spec cannot hold
 * Home to the weaker one by naming it something else.
 */
export async function expectEachConnectionStatedOnce(page: Page, where: string): Promise<void> {
  const statements = await readConnectionStatements(page);
  expect(repeatedStatements(statements), `${where}: a connection sentence is said twice`).toEqual(
    [],
  );
  if (new URL(page.url()).pathname === "/overview") {
    expect(
      statementsOutsideTheSetupCard(statements),
      `${where}: a connection sentence is outside "Get set up"`,
    ).toEqual([]);
  }
}
