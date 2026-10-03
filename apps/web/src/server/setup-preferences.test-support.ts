import type { AuthenticatedPrincipal } from "@oalo/application";
import { expect, vi } from "vitest";

/**
 * What the setup-preferences read and write tests have in common: the saved profile read as a
 * failing driver leaves it, the server log that records the failure, and the sentence that log line
 * must never contain.
 *
 * This module imports nothing at run time but `vitest`. A `vi.mock` factory in a test file can load
 * it with a dynamic `import()`, because those factories run while the module under test is still
 * being imported, and a static import of anything heavier here could reach a module that is itself
 * being mocked.
 */

/**
 * A tenant transaction for a person who has stored nothing: every read finds no rows, so there is no
 * saved profile and the Brand form starts empty. The preferences table is not what these cases are
 * about.
 */
export async function transactionWithNothingStored(
  _pool: unknown,
  _authority: unknown,
  work: (transaction: { read: () => Promise<readonly unknown[]> }) => Promise<unknown>,
): Promise<unknown> {
  return work({ read: () => Promise.resolve([]) });
}

/** What a database driver says when it fails: a message that may carry anything, and a short code. */
export function driverFailure(): Error {
  return Object.assign(
    new Error("connection terminated while reading for dana.reyes@example.test"),
    { code: "57P01" },
  );
}

/** The server's log, with what is written to it kept for the test to read instead of printed. */
export function spyOnServerLog() {
  return vi.spyOn(console, "error").mockImplementation(() => undefined);
}

export type ServerLogSpy = ReturnType<typeof spyOnServerLog>;

/** The first thing written to the server log, as the one line it is read as. */
export function firstLoggedLine(logged: ServerLogSpy): string {
  return String(logged.mock.calls[0]?.join(" "));
}

/**
 * A log line says what kind of failure it was, which is useful and carries nothing about anyone.
 * The driver's message is its own and can carry a value, so it is not logged, and neither is
 * anything that names the person, the session, or the workspace they were reading.
 */
export function expectNoPersonSessionOrDriverWords(
  line: string,
  principal: AuthenticatedPrincipal,
): void {
  expect(line).not.toContain("dana.reyes");
  expect(line).not.toContain("connection terminated");
  expect(line).not.toContain(principal.actorId);
  expect(line).not.toContain(principal.sessionId);
  expect(line).not.toContain(principal.locationId);
  expect(line).not.toContain(principal.actorRef);
  expect(line).not.toContain(principal.locationRef);
}
