import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { Page, Response as BrowserResponse } from "@playwright/test";
import {
  preserveReviewPassOutput,
  REVIEW_PASS_ARTIFACT_DIRECTORY,
} from "../../../scripts/database/review-browser-run.mjs";
import { signInExisting } from "../../../../tests/browser/review/helpers/guided-setup-journey.js";

const roots: string[] = [];
const fixtureDirectory = resolve("test-results/integration/ci-regressions/fixtures");
async function fixtureRoot() {
  await mkdir(fixtureDirectory, { recursive: true });
  const root = await mkdtemp(join(fixtureDirectory, "oalo-browser-evidence-"));
  roots.push(root);
  return root;
}
async function removeWithin(root: string, path: string) {
  const offset = relative(resolve(root), resolve(path));
  if (!offset || offset.startsWith("..") || isAbsolute(offset))
    throw new Error("Refuse cleanup outside the fixture root");
  await rm(path, { recursive: true, force: true });
}
afterEach(async () => {
  for (const root of roots.splice(0)) await removeWithin(fixtureDirectory, root);
});
async function writeFailure(root: string, trace: Uint8Array, text: string) {
  const directory = join(root, "test-results/browser/failed-sign-in");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "trace.zip"), trace);
  await writeFile(join(directory, "error-context.md"), text);
}

describe("per-pass browser failure evidence", () => {
  it("preserves original first-pass trace and error bytes when the second pass clears output", async () => {
    const root = await fixtureRoot();
    const first = Uint8Array.from([80, 75, 3, 4, 0, 17, 255]);
    const second = Uint8Array.from([80, 75, 3, 4, 99]);
    await writeFailure(root, first, "# Synthetic first-pass sign-in failure\n");
    await preserveReviewPassOutput(root, "samples");
    await removeWithin(root, join(root, "test-results/browser"));
    await writeFailure(root, second, "# Synthetic second-pass failure\n");
    await preserveReviewPassOutput(root, "real");
    await removeWithin(root, join(root, "test-results/browser"));
    for (const [catalog, bytes, text] of [
      ["samples", first, "# Synthetic first-pass sign-in failure\n"],
      ["real", second, "# Synthetic second-pass failure\n"],
    ] as const) {
      const directory = join(root, REVIEW_PASS_ARTIFACT_DIRECTORY, catalog, "failed-sign-in");
      expect((await readFile(join(directory, "trace.zip"))).equals(Buffer.from(bytes))).toBe(true);
      expect(await readFile(join(directory, "error-context.md"), "utf8")).toBe(text);
    }
  });
  it("does not manufacture an artifact if Playwright wrote no output", async () => {
    expect(await preserveReviewPassOutput(await fixtureRoot(), "samples")).toBe(false);
  });
  it.each(["../outside", "samples/../../outside", "demo"])(
    "refuses an unrecognized pass name %s",
    async (name) => {
      await expect(preserveReviewPassOutput(await fixtureRoot(), name)).rejects.toThrow(
        "fixed review pass",
      );
    },
  );
  it.each(["source", "destination"])(
    "refuses a %s junction escaping the artifact tree",
    async (side) => {
      const root = await fixtureRoot();
      const outside = await fixtureRoot();
      await mkdir(join(root, "test-results"));
      await writeFile(join(outside, "private.txt"), "Synthetic outside marker");
      if (side === "source") await symlink(outside, join(root, "test-results/browser"), "junction");
      else {
        await writeFailure(root, Uint8Array.from([1]), "Synthetic context");
        await symlink(outside, join(root, "test-results/browser-passes"), "junction");
      }
      await expect(preserveReviewPassOutput(root, "samples")).rejects.toThrow("symbolic");
      expect(await readFile(join(outside, "private.txt"), "utf8")).toBe("Synthetic outside marker");
    },
  );
  it("rejects a nested source junction without copying outside contents", async () => {
    const root = await fixtureRoot();
    const outside = await fixtureRoot();
    await writeFailure(root, Uint8Array.from([1]), "Synthetic context");
    await writeFile(join(outside, "private.txt"), "Synthetic outside marker");
    await symlink(outside, join(root, "test-results/browser/foreign"), "junction");
    await expect(preserveReviewPassOutput(root, "samples")).rejects.toThrow("symbolic");
    await expect(
      readFile(join(root, REVIEW_PASS_ARTIFACT_DIRECTORY, "samples/foreign/private.txt")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("does not overwrite retained evidence on a repeated pass", async () => {
    const root = await fixtureRoot();
    await writeFailure(root, Uint8Array.from([1]), "First evidence");
    await preserveReviewPassOutput(root, "samples");
    await writeFailure(root, Uint8Array.from([2]), "New evidence");
    await expect(preserveReviewPassOutput(root, "samples")).rejects.toThrow();
    expect(
      await readFile(
        join(root, REVIEW_PASS_ARTIFACT_DIRECTORY, "samples/failed-sign-in/error-context.md"),
        "utf8",
      ),
    ).toBe("First evidence");
  });
  it("keeps the producer directory in the existing database failure artifact consumer", async () => {
    const workflow = await readFile(resolve(".github/workflows/ci.yml"), "utf8");
    const block = workflow.split("name: database-failure-traces")[1]?.split("retention-days: 7")[0];
    expect(block).toContain("test-results/browser");
    expect(block).toContain(REVIEW_PASS_ARTIFACT_DIRECTORY);
  });
});

function responseFixture(
  status: number,
  url = "https://127.0.0.1:3443/api/auth/sign-in",
  method = "POST",
) {
  return {
    status: () => status,
    url: () => url,
    request: () => ({ method: () => method }),
  } as unknown as BrowserResponse;
}
function signInBrowser(status: number) {
  const events: string[] = [];
  let url = "https://127.0.0.1:3443/sign-in";
  const click = vi.fn(async () => {
    events.push("click");
  });
  const waitForURL = vi.fn(async () => {
    url = "https://127.0.0.1:3443/overview";
  });
  const page = {
    goto: vi.fn(async () => undefined),
    url: () => url,
    getByLabel: () => ({ first: () => ({ click: vi.fn(async () => undefined) }) }),
    keyboard: { type: vi.fn(async () => undefined) },
    getByRole: () => ({ click }),
    waitForURL,
    waitForResponse: vi.fn(async (predicate: (value: BrowserResponse) => boolean) => {
      events.push("observe response");
      expect(predicate(responseFixture(status))).toBe(true);
      expect(predicate(responseFixture(status, "https://foreign.test/api/auth/sign-in"))).toBe(
        false,
      );
      expect(predicate(responseFixture(status, undefined, "GET"))).toBe(false);
      expect(predicate(responseFixture(status, "https://127.0.0.1:3443/api/other"))).toBe(false);
      const response = responseFixture(
        status,
        "https://127.0.0.1:3443/api/auth/sign-in?token=synthetic-query-marker",
      );
      expect(predicate(response)).toBe(true);
      return response;
    }),
  } as unknown as Page;
  return { page, waitForURL, events };
}
describe("review sign-in response evidence", () => {
  it("observes the same-origin POST before clicking and follows actual successful navigation", async () => {
    const browser = signInBrowser(200);
    await signInExisting(browser.page, "synthetic@oalo.invalid", "Synthetic secret phrase");
    expect(browser.events).toEqual(["observe response", "click"]);
    expect(browser.waitForURL).toHaveBeenCalledOnce();
  });
  it.each([401, 429, 503])(
    "fails before navigation on HTTP %i without leaking input",
    async (status) => {
      const browser = signInBrowser(status);
      let message = "";
      try {
        await signInExisting(browser.page, "synthetic@oalo.invalid", "Synthetic secret phrase");
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        message = error.message;
      }
      expect(message).toContain("POST /api/auth/sign-in status");
      expect(message).toContain(String(status));
      expect(message).not.toMatch(
        /synthetic@|Synthetic secret|cookie|token=|synthetic-query-marker|https:\/\//u,
      );
      expect(browser.waitForURL).not.toHaveBeenCalled();
    },
  );
});
