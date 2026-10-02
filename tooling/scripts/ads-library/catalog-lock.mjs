import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { format, resolveConfig } from "prettier";

/**
 * PRD-009c 009C-AC-002. The append-only lock of an ads library catalog.
 *
 * An `(id, version)` is never edited: a change is a new version (D7). The lock records, for every
 * `(id, version)` that was ever merged, the digests of both art files, a digest of the default
 * words, and the editable limits. The schema test compares the catalog against it offline and fails
 * on any changed or removed line, and CI also compares the lock against `origin/main` when that ref
 * is fetched, so a line cannot be quietly rewritten in the same pull request that changes an entry.
 *
 * `node tooling/scripts/ads-library/catalog-lock.mjs --catalog <catalog.json> --lock <lock.json>`
 * appends a line for each new `(id, version)` and refuses to touch an existing one.
 */

export function defaultsDigest(defaults) {
  return createHash("sha256")
    .update(JSON.stringify({ headline: defaults.headline, primaryText: defaults.primaryText }))
    .digest("hex");
}

export function lockLineFor(entry) {
  return {
    id: entry.id,
    version: entry.version,
    tallSha256: entry.images.tall.sha256,
    squareSha256: entry.images.square.sha256,
    defaultsSha256: defaultsDigest(entry.defaults),
    headlineMaxLength: entry.editable.headline.maxLength,
    primaryTextMaxLength: entry.editable.primaryText.maxLength,
  };
}

function lockKey(line) {
  return `${line.id}@${String(line.version)}`;
}

function sameLine(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * The differences between a lock and a catalog: every lock line must still describe its entry
 * exactly, and every entry must have a lock line. Each problem is one plain sentence.
 */
export function lockProblems(lock, entries) {
  const problems = [];
  const byKey = new Map(entries.map((entry) => [lockKey(entry), lockLineFor(entry)]));
  const locked = new Set();
  for (const line of lock) {
    const key = lockKey(line);
    if (locked.has(key)) problems.push(`The lock lists ${key} twice.`);
    locked.add(key);
    const current = byKey.get(key);
    if (current === undefined) {
      problems.push(`${key} is in the lock but was removed from the catalog.`);
    } else if (!sameLine(current, line)) {
      problems.push(`${key} changed after it was locked; a change is a new version.`);
    }
  }
  for (const key of byKey.keys()) {
    if (!locked.has(key))
      problems.push(`${key} has no lock line; append one with catalog-lock.mjs.`);
  }
  return problems;
}

/** Lines the base lock had that the current lock dropped or changed. Appending is the only edit. */
export function lockRewrites(baseLock, currentLock) {
  const current = new Map(currentLock.map((line) => [lockKey(line), line]));
  return baseLock
    .filter((line) => {
      const now = current.get(lockKey(line));
      return now === undefined || !sameLine(now, line);
    })
    .map((line) => `${lockKey(line)} was removed or rewritten in the lock.`);
}

export function appendLockLines(lock, entries) {
  const known = new Map(lock.map((line) => [lockKey(line), line]));
  const appended = [...lock];
  for (const entry of entries) {
    const line = lockLineFor(entry);
    const existing = known.get(lockKey(line));
    if (existing === undefined) {
      appended.push(line);
      known.set(lockKey(line), line);
    } else if (!sameLine(existing, line)) {
      throw new Error(`${lockKey(line)} changed after it was locked; add a new version instead.`);
    }
  }
  return appended;
}

export async function formatJson(value, filePath) {
  const options = (await resolveConfig(filePath)) ?? {};
  return format(JSON.stringify(value), { ...options, parser: "json", filepath: filePath });
}

async function main(argv) {
  const catalogIndex = argv.indexOf("--catalog");
  const lockIndex = argv.indexOf("--lock");
  const catalogPath = catalogIndex === -1 ? undefined : argv[catalogIndex + 1];
  const lockPath = lockIndex === -1 ? undefined : argv[lockIndex + 1];
  if (catalogPath === undefined || lockPath === undefined) {
    throw new Error("Usage: catalog-lock.mjs --catalog <catalog.json> --lock <lock.json>");
  }
  const entries = JSON.parse(await readFile(catalogPath, "utf8"));
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  const appended = appendLockLines(lock, entries);
  await writeFile(lockPath, await formatJson(appended, lockPath), "utf8");
  process.stdout.write(`${String(appended.length - lock.length)} lock line(s) appended.\n`);
}

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  await main(process.argv.slice(2));
}
