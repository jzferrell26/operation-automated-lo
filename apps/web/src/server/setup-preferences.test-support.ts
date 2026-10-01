import type { AuthenticatedPrincipal } from "@oalo/application";
import { expect, vi, type Mock } from "vitest";

/**
 * What the two setup-preferences read tests have in common (PRD-008b 008B-AC-009 to 008B-AC-011,
 * writing review R6): the campaign list read as a failing driver leaves it, the server log that
 * records the failure, and the sentence that log line must never contain.
 *
 * This module imports nothing at run time but `vitest`. The `vi.mock` factories in the two test
 * files load it with a dynamic `import()`, because those factories run while the module under test
 * is still being imported, and a static import of anything heavier here could reach a module that
 * is itself being mocked.
 */

/** A stand-in for `./campaign-workspace-reads.js`, so a test says what the list read answers. */
export function campaignWorkspaceReadsDouble(): {
  listWorkspaceCampaigns: Mock;
  loadWorkspaceCampaign: Mock;
} {
  return { listWorkspaceCampaigns: vi.fn(), loadWorkspaceCampaign: vi.fn() };
}

/**
 * A tenant transaction for a person who has stored nothing: every read finds no rows, so the
 * walkthrough is at its start and the read goes on to the campaign list. The preferences table is
 * not what these cases are about.
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
