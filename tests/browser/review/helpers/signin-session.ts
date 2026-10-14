import { lstat, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { z } from "zod";

const ORIGIN = "https://127.0.0.1:3443";
const EXPECTED = {
  creator: { name: "Review creator", role: "Campaign creator" },
  approver: { name: "Review approver", role: "Approver" },
} as const;
type Actor = keyof typeof EXPECTED;
const Cookie = z
  .object({
    name: z.literal("__Host-oalo_session"),
    value: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
    domain: z.literal("127.0.0.1"),
    path: z.literal("/"),
    secure: z.literal(true),
    httpOnly: z.literal(true),
    sameSite: z.literal("Lax"),
    expires: z.number().finite(),
  })
  .strict();
const Candidate = z
  .object({
    actor: z.enum(["creator", "approver"]),
    origin: z.literal(ORIGIN),
    capturedAt: z.number().finite(),
    csrf: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
    cookie: Cookie,
  })
  .strict();
export type ReviewSessionCandidate = z.infer<typeof Candidate>;
type Proof = { csrf: string; name: string; role: string; workspace: string; origin: string };
type Ports = {
  install(cookie: ReviewSessionCandidate["cookie"]): Promise<void>;
  clear(): Promise<void>;
  verify(): Promise<Proof | undefined>;
  signIn(): Promise<void>;
};
function valid(input: unknown, actor: Actor): ReviewSessionCandidate | undefined {
  const result = Candidate.safeParse(input);
  const now = Date.now();
  if (
    !result.success ||
    result.data.actor !== actor ||
    result.data.capturedAt > now ||
    now - result.data.capturedAt > 7_200_000 ||
    result.data.cookie.expires <= now / 1000
  )
    return undefined;
  return result.data;
}
function matches(actor: Actor, proof: Proof | undefined): proof is Proof {
  return (
    proof !== undefined &&
    proof.origin === ORIGIN &&
    proof.name === EXPECTED[actor].name &&
    proof.role === EXPECTED[actor].role &&
    proof.workspace === "Review location (not connected)" &&
    /^[A-Za-z0-9_-]{43}$/u.test(proof.csrf)
  );
}

/** Setup reuse never manufactures a cookie or a token. Every acceptance requires a fresh server read. */
export async function acquireReviewSession(
  actor: Actor,
  input: unknown,
  ports: Ports,
): Promise<"fresh" | "reused"> {
  const saved = valid(input, actor);
  if (saved !== undefined) {
    await ports.install(structuredClone(saved.cookie));
    const proof = await ports.verify().catch(() => undefined);
    if (matches(actor, proof) && proof.csrf === saved.csrf) return "reused";
  }
  await ports.clear();
  await ports.signIn(); // Exactly one fallback; the real helper still asserts POST 200.
  if (!matches(actor, await ports.verify()))
    throw new Error("Review setup session verification failed");
  return "fresh";
}

export async function createReviewSessionCache(
  environment: Readonly<Record<string, string | undefined>>,
) {
  const directory = environment["OALO_REVIEW_SESSION_CACHE_DIR"];
  if (
    environment["OALO_REVIEW_BROWSER_RUN"] !== "true" ||
    environment["OALO_REVIEW_CATALOG"] !== "samples" ||
    environment["OALO_REVIEW_APP_URL"] !== ORIGIN ||
    directory === undefined ||
    directory !== resolve(directory) ||
    !/^oalo-review-sessions-[A-Za-z0-9]+$/u.test(basename(directory))
  )
    return undefined;
  try {
    const info = await lstat(directory);
    if (
      dirname(directory) !== (await realpath(tmpdir())) ||
      !info.isDirectory() ||
      info.isSymbolicLink() ||
      (await realpath(directory)) !== resolve(directory) ||
      Date.now() - info.birthtimeMs > 7_200_000 ||
      (process.platform !== "win32" &&
        ((info.mode & 0o777) !== 0o700 || info.uid !== process.getuid?.()))
    )
      return undefined;
  } catch {
    return undefined;
  }
  return {
    async load(actor: Actor): Promise<ReviewSessionCandidate | undefined> {
      const path = join(directory, `${actor}.json`);
      try {
        const info = await lstat(path);
        if (
          !info.isFile() ||
          info.isSymbolicLink() ||
          info.size > 4096 ||
          (process.platform !== "win32" &&
            ((info.mode & 0o777) !== 0o600 || info.uid !== process.getuid?.()))
        )
          return undefined;
        const result = valid(JSON.parse(await readFile(path, "utf8")), actor);
        return result !== undefined &&
          result.capturedAt >= Math.floor((await lstat(directory)).birthtimeMs)
          ? result
          : undefined;
      } catch {
        return undefined;
      }
    },
    async save(input: ReviewSessionCandidate): Promise<void> {
      const checked = valid(input, input.actor);
      if (checked === undefined) return;
      const temporary = join(directory, `${input.actor}-${randomUUID()}.tmp`);
      await writeFile(temporary, JSON.stringify(checked), { flag: "wx", mode: 0o600 });
      await rename(temporary, join(directory, `${input.actor}.json`));
    },
  };
}

function seededActor(email: string): Actor | undefined {
  if (email === process.env["OALO_TEST_SEEDED_CREATOR_EMAIL"]) return "creator";
  if (email === process.env["OALO_TEST_SEEDED_APPROVER_EMAIL"]) return "approver";
  return undefined;
}

/** Called only after the existing password POST and workspace-choice path succeeded. */
export async function captureSuccessfulReviewSignIn(page: Page, email: string): Promise<void> {
  const actor = seededActor(email);
  const cache = await createReviewSessionCache(process.env);
  if (actor === undefined || cache === undefined || new URL(page.url()).origin !== ORIGIN) return;
  const csrf = await page.locator('meta[name="oalo-csrf-token"]').getAttribute("content");
  const label = await page
    .getByRole("banner")
    .getByRole("button", { name: /^Your account: /u })
    .getAttribute("aria-label");
  if (csrf === null || label !== `Your account: ${EXPECTED[actor].name}`) return;
  const cookie = (await page.context().cookies(ORIGIN)).find(
    (value) => value.name === "__Host-oalo_session",
  );
  // Project the one cookie explicitly; no localStorage, passwords, other cookies or browser state.
  if (cookie === undefined) return;
  const parsed = Candidate.safeParse({
    actor,
    origin: ORIGIN,
    capturedAt: Date.now(),
    csrf,
    cookie: {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expires: cookie.expires,
    },
  });
  if (parsed.success) await cache.save(parsed.data);
}

async function currentProof(page: Page): Promise<Proof | undefined> {
  const response = await page.goto(`${ORIGIN}/overview`, { waitUntil: "domcontentloaded" });
  if (response?.status() !== 200 || new URL(page.url()).origin !== ORIGIN) return undefined;
  const meta = page.locator('meta[name="oalo-csrf-token"]');
  if ((await meta.count()) !== 1) return undefined;
  const csrf = await meta.getAttribute("content");
  if (csrf === null) return undefined;
  const button = page.getByRole("banner").getByRole("button", { name: /^Your account: /u });
  await button.click();
  const account = page.getByRole("dialog", { name: "Your account" });
  const identity = account.locator("strong").first();
  const name = await identity.textContent();
  const values = await identity.locator("..").locator("span").allTextContents();
  await page.keyboard.press("Escape");
  await button.blur();
  if (name === null || values.length !== 2) return undefined;
  return {
    csrf,
    name,
    role: values[0]!,
    workspace: values[1]!,
    origin: new URL(page.url()).origin,
  };
}

/** Only webinar preparation calls this. Authentication journeys always call signInExisting directly. */
export async function signInForReviewPreparation(
  page: Page,
  email: string,
  signIn: () => Promise<void>,
): Promise<"fresh" | "reused"> {
  const actor = seededActor(email);
  const cache = await createReviewSessionCache(process.env);
  if (actor === undefined) throw new Error("Review setup requires a seeded actor");
  if (page.url() !== "about:blank" && new URL(page.url()).origin !== ORIGIN)
    throw new Error("Review setup requires the owned loopback origin");
  return acquireReviewSession(actor, await cache?.load(actor), {
    install: (cookie) => page.context().addCookies([cookie]),
    clear: () => page.context().clearCookies(),
    verify: () => currentProof(page),
    signIn,
  });
}
