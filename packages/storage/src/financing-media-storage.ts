import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, lstat, open, realpath, link, unlink } from "node:fs/promises";
import { dirname, join, parse, relative, resolve } from "node:path";
import {
  FinancingMediaRecordSchema,
  FinancingMediaRefSchema,
  FinancingMediaRevocationSchema,
  OpaqueReferenceSchema,
  type FinancingMediaRecord,
} from "@oalo/contracts";

export function financingMediaKey(input: FinancingMediaRecord): string {
  const record = FinancingMediaRecordSchema.parse(input);
  return `locations/${record.locationRef}/financing-media/${record.mediaRef}/${record.sha256}.${record.mimeType === "image/jpeg" ? "jpg" : "png"}`;
}
export class FinancingMediaStorageError extends Error {
  constructor(public readonly kind: "conflict" | "integrity" | "unavailable") {
    super("Private financing media storage failed.");
  }
}
function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
function exists(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

/** Only composition in the explicitly synthetic runtime may construct this store. */
export function createFilesystemFinancingMediaStore(
  rootInput: string,
  scope: { locationRef: string; actorRef: string },
  now: () => Date = () => new Date(),
) {
  const root = resolve(rootInput);
  const locationRef = OpaqueReferenceSchema.parse(scope.locationRef);
  const actorRef = OpaqueReferenceSchema.parse(scope.actorRef);
  async function confined(key: string, createParents: boolean): Promise<string> {
    if (
      !/^[A-Za-z0-9._/-]+$/u.test(key) ||
      key.split("/").some((part) => !part || part === "." || part === "..")
    )
      throw new FinancingMediaStorageError("unavailable");
    const target = resolve(root, key);
    const rel = relative(root, target);
    if (rel.startsWith("..") || rel === "") throw new FinancingMediaStorageError("unavailable");
    const base = parse(target).root;
    let current = base;
    for (const part of relative(base, dirname(target)).split(/[\\/]/u)) {
      current = join(current, part);
      try {
        const stat = await lstat(current);
        if (stat.isSymbolicLink() || !stat.isDirectory())
          throw new FinancingMediaStorageError("unavailable");
      } catch (error) {
        if (!missing(error) || !createParents) throw error;
        try {
          await mkdir(current);
        } catch (failure) {
          if (!exists(failure)) throw failure;
        }
        const stat = await lstat(current);
        if (stat.isSymbolicLink() || !stat.isDirectory())
          throw new FinancingMediaStorageError("unavailable");
      }
    }
    const parent = await realpath(dirname(target));
    if (resolve(parent) !== resolve(dirname(target)))
      throw new FinancingMediaStorageError("unavailable");
    return target;
  }
  async function load(key: string, maximum: number): Promise<Uint8Array | undefined> {
    try {
      const target = await confined(key, false);
      const stat = await lstat(target);
      if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 1 || stat.size > maximum)
        throw new FinancingMediaStorageError("integrity");
      const file = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        const opened = await file.stat();
        if (opened.size !== stat.size || opened.ino !== stat.ino)
          throw new FinancingMediaStorageError("integrity");
        const bytes = new Uint8Array(opened.size + 1);
        let total = 0;
        while (total < bytes.length) {
          const result = await file.read(bytes, total, bytes.length - total, total);
          if (result.bytesRead === 0) break;
          total += result.bytesRead;
        }
        if (total !== stat.size) throw new FinancingMediaStorageError("integrity");
        return bytes.slice(0, total);
      } finally {
        await file.close();
      }
    } catch (error) {
      if (missing(error)) return undefined;
      throw error;
    }
  }
  async function append(key: string, bytes: Uint8Array): Promise<boolean> {
    const target = await confined(key, true);
    const temporary = await confined(`${key}.${randomUUID()}.tmp`, true);
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(bytes);
      await file.sync();
      await file.close();
      try {
        await link(temporary, target);
        return true;
      } catch (error) {
        if (exists(error)) return false;
        throw error;
      }
    } finally {
      // Cleanup failure must not turn an already linked immutable object into an
      // ambiguous overwrite/retry. Any leftover temporary bytes remain private.
      await file.close().catch(() => undefined);
      await unlink(temporary).catch(() => undefined);
    }
  }
  const recordKey = (ref: string) =>
    `locations/${locationRef}/financing-media/${FinancingMediaRefSchema.parse(ref)}/record.json`;
  async function find(ref: string) {
    const raw = await load(recordKey(ref), 8192);
    if (!raw) return undefined;
    const record = FinancingMediaRecordSchema.parse(JSON.parse(Buffer.from(raw).toString("utf8")));
    if (record.locationRef !== locationRef || record.mediaRef !== ref)
      throw new FinancingMediaStorageError("integrity");
    const revoked = await load(recordKey(ref).replace("record.json", "revocation.json"), 2048);
    return {
      record,
      revocation: revoked
        ? FinancingMediaRevocationSchema.parse(JSON.parse(Buffer.from(revoked).toString("utf8")))
        : null,
    };
  }
  return {
    find,
    async commitReady(input: FinancingMediaRecord) {
      const record = FinancingMediaRecordSchema.parse(input);
      if (record.locationRef !== locationRef || record.createdBy !== actorRef)
        throw new FinancingMediaStorageError("conflict");
      const written = await append(recordKey(record.mediaRef), Buffer.from(JSON.stringify(record)));
      const ready = await find(record.mediaRef);
      if (!ready || ready.record.requestHash !== record.requestHash)
        throw new FinancingMediaStorageError("conflict");
      if (!written && ready.record.sha256 !== record.sha256)
        throw new FinancingMediaStorageError("conflict");
      return ready.record;
    },
    async revoke(ref: string) {
      const found = await find(ref);
      if (!found) throw new FinancingMediaStorageError("unavailable");
      if (found.revocation) return found.revocation;
      const revocation = { mediaRef: ref, revokedBy: actorRef, revokedAt: now().toISOString() };
      await append(
        recordKey(ref).replace("record.json", "revocation.json"),
        Buffer.from(JSON.stringify(revocation)),
      );
      const result = await find(ref);
      if (!result?.revocation) throw new FinancingMediaStorageError("unavailable");
      return result.revocation;
    },
    async putImmutable(record: FinancingMediaRecord, bytes: Uint8Array) {
      if (
        record.locationRef !== locationRef ||
        record.byteSize !== bytes.length ||
        createHash("sha256").update(bytes).digest("hex") !== record.sha256
      )
        throw new FinancingMediaStorageError("integrity");
      await append(financingMediaKey(record), bytes);
      const stored = await load(financingMediaKey(record), record.byteSize);
      if (!stored || createHash("sha256").update(stored).digest("hex") !== record.sha256)
        throw new FinancingMediaStorageError("integrity");
    },
    async read(record: FinancingMediaRecord) {
      if (record.locationRef !== locationRef) throw new FinancingMediaStorageError("unavailable");
      const bytes = await load(financingMediaKey(record), record.byteSize);
      if (!bytes) throw new FinancingMediaStorageError("integrity");
      return bytes;
    },
  };
}
