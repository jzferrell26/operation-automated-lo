import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  acquireReviewSession,
  createReviewSessionCache,
  type ReviewSessionCandidate,
} from "../../../tests/browser/review/helpers/signin-session.js";
import {
  createReviewSessionDirectory,
  removeReviewSessionDirectory,
} from "../../scripts/database/review-browser-run.mjs";

const origin = "https://127.0.0.1:3443";
const candidate: ReviewSessionCandidate = {
  actor: "creator",
  origin,
  capturedAt: Date.now(),
  csrf: "a".repeat(43),
  cookie: {
    name: "__Host-oalo_session",
    value: "a".repeat(43),
    domain: "127.0.0.1",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    expires: Date.now() / 1000 + 3600,
  },
};
const proof = {
  csrf: candidate.csrf,
  name: "Review creator",
  role: "Campaign creator",
  workspace: "Review location (not connected)",
  origin,
};

describe("review setup reuses only server-verified password sessions", () => {
  it("stays below a 20-attempt allowance across repeated preparation and worker restarts", async () => {
    let signIns = 20;
    for (let restart = 0; restart < 8; restart++) {
      const result = await acquireReviewSession("creator", candidate, {
        install: async () => {},
        clear: async () => {},
        verify: async () => proof,
        signIn: async () => {
          signIns++;
          throw new Error("429");
        },
      });
      expect(result).toBe("reused");
    }
    expect(signIns).toBe(20);
  });
  it.each([
    ["revoked", undefined],
    ["token mismatch", { ...proof, csrf: "b".repeat(43) }],
    ["wrong actor", { ...proof, name: "Review approver" }],
    ["stale role", { ...proof, role: "Viewer" }],
    ["wrong workspace", { ...proof, workspace: "Other workspace" }],
    ["foreign origin", { ...proof, origin: "https://example.com" }],
  ])("%s clears the candidate and uses one real sign-in fallback", async (_reason, firstProof) => {
    const events: string[] = [];
    let calls = 0;
    expect(
      await acquireReviewSession("creator", candidate, {
        install: async () => {
          events.push("install");
        },
        clear: async () => {
          events.push("clear");
        },
        verify: async () => (++calls === 1 ? firstProof : proof),
        signIn: async () => {
          events.push("sign-in");
        },
      }),
    ).toBe("fresh");
    expect(events).toEqual(["install", "clear", "sign-in"]);
  });
  it("refuses a wrong identity after fallback without looping or accepting it", async () => {
    let signIns = 0;
    await expect(
      acquireReviewSession("approver", undefined, {
        install: async () => {},
        clear: async () => {},
        verify: async () => proof,
        signIn: async () => {
          signIns++;
        },
      }),
    ).rejects.toThrow("Review setup session verification failed");
    expect(signIns).toBe(1);
  });
  it.each([
    { ...candidate, origin: "https://example.com" },
    { ...candidate, actor: "approver" },
    { ...candidate, capturedAt: Date.now() + 3_600_000 },
    { ...candidate, capturedAt: Date.now() - 7_200_001 },
    { ...candidate, cookie: { ...candidate.cookie, secure: false } },
    { ...candidate, cookie: { ...candidate.cookie, httpOnly: false } },
    { ...candidate, cookie: { ...candidate.cookie, domain: "example.com" } },
    { ...candidate, cookie: { ...candidate.cookie, path: "/private" } },
    { ...candidate, cookie: { ...candidate.cookie, sameSite: "None" } },
    { ...candidate, cookie: { ...candidate.cookie, expires: 1 } },
    { ...candidate, cookie: { ...candidate.cookie, value: "invalid" } },
  ])("does not import an invalid or stale cookie", async (invalid) => {
    let installed = 0;
    expect(
      await acquireReviewSession("creator", invalid, {
        install: async () => {
          installed++;
        },
        clear: async () => {},
        verify: async () => proof,
        signIn: async () => {},
      }),
    ).toBe("fresh");
    expect(installed).toBe(0);
  });
  it("clones cookie data so contexts cannot mutate another context's candidate", async () => {
    const original = structuredClone(candidate);
    await acquireReviewSession("creator", original, {
      install: async (cookie) => {
        cookie.value = "changed";
      },
      clear: async () => {},
      verify: async () => proof,
      signIn: async () => {},
    });
    expect(original.cookie.value).toBe(candidate.cookie.value);
  });
  it("keeps actual private files outside artifacts, scoped to one run and actor", async () => {
    const directory = await mkdtemp(join(tmpdir(), "oalo-review-sessions-"));
    try {
      const env = {
        OALO_REVIEW_BROWSER_RUN: "true",
        OALO_REVIEW_CATALOG: "samples",
        OALO_REVIEW_APP_URL: origin,
        OALO_REVIEW_SESSION_CACHE_DIR: directory,
      };
      const cache = await createReviewSessionCache(env);
      expect(cache).toBeDefined();
      const captured = { ...candidate, capturedAt: Date.now() };
      await cache!.save(captured);
      expect(await cache!.load("creator")).toEqual(captured);
      expect(await cache!.load("approver")).toBeUndefined();
      const raw = await readFile(join(directory, "creator.json"), "utf8");
      expect(raw).not.toMatch(/password|localStorage|email/);
      if (process.platform !== "win32")
        expect((await stat(join(directory, "creator.json"))).mode & 0o777).toBe(0o600);
      const different = await mkdtemp(join(tmpdir(), "oalo-review-sessions-"));
      try {
        expect(
          await (await createReviewSessionCache({
            ...env,
            OALO_REVIEW_SESSION_CACHE_DIR: different,
          }))!.load("creator"),
        ).toBeUndefined();
      } finally {
        await rm(different, { recursive: true, force: true });
      }
      expect(
        await createReviewSessionCache({ ...env, OALO_REVIEW_BROWSER_RUN: "false" }),
      ).toBeUndefined();
      expect(
        await createReviewSessionCache({ ...env, OALO_REVIEW_CATALOG: "real" }),
      ).toBeUndefined();
      expect(
        await createReviewSessionCache({ ...env, OALO_REVIEW_SESSION_CACHE_DIR: process.cwd() }),
      ).toBeUndefined();
      expect(
        await createReviewSessionCache({ ...env, OALO_REVIEW_APP_URL: "https://example.com" }),
      ).toBeUndefined();
      expect(
        await createReviewSessionCache({ ...env, OALO_REVIEW_SESSION_CACHE_DIR: undefined }),
      ).toBeUndefined();
      await writeFile(join(directory, "creator.json"), "not json", { mode: 0o600 });
      expect(await cache!.load("creator")).toBeUndefined();
      await rm(join(directory, "creator.json"));
      await symlink(join(directory, "sentinel"), join(directory, "creator.json"));
      expect(await cache!.load("creator")).toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("deletes only its checked private directory and refuses a substituted symlink", async () => {
    const owned = await createReviewSessionDirectory();
    await writeFile(join(owned, "creator.json"), "disposable fixture", { mode: 0o600 });
    if (process.platform !== "win32") expect((await stat(owned)).mode & 0o777).toBe(0o700);
    await removeReviewSessionDirectory(owned);
    await expect(stat(owned)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(removeReviewSessionDirectory(process.cwd())).rejects.toThrow("Refuse cleanup");
    const foreign = await mkdtemp(join(tmpdir(), "oalo-review-sessions-"));
    try {
      await expect(removeReviewSessionDirectory(foreign)).rejects.toThrow("Refuse cleanup");
    } finally {
      await rm(foreign, { recursive: true, force: true });
    }
    const target = await mkdtemp(join(tmpdir(), "signin-sentinel-"));
    const link = await createReviewSessionDirectory();
    await rm(link, { recursive: true });
    try {
      await writeFile(join(target, "sentinel"), "keep");
      await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
      await expect(removeReviewSessionDirectory(link)).rejects.toThrow("Refuse cleanup");
      expect(await readFile(join(target, "sentinel"), "utf8")).toBe("keep");
    } finally {
      await rm(link, { force: true });
      await rm(target, { recursive: true, force: true });
    }
  });
});
