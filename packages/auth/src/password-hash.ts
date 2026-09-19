import { argon2Sync, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * PRD-006a D2. Password derivation on `node:crypto`, with no new dependency.
 *
 * **The algorithm decision.** PRD-006a D2 left one open question: whether the pinned Node
 * 24.18.0 exposes an Argon2 API, in which case Argon2id is preferred over scrypt because the
 * OWASP Password Storage Cheat Sheet prefers it and only falls back to scrypt when Argon2id is
 * unavailable. It does: `node:crypto` on 24.18.0 exports `argon2` and `argon2Sync`, both of which
 * work without a flag and emit no experimental warning. Measured on the pinned runtime, a single
 * derivation at the OWASP Argon2id baseline (19 MiB, `t = 2`, `p = 1`) takes a median 28.7 ms,
 * against 255.1 ms for scrypt at the OWASP scrypt minimum (`N = 2^17`, `r = 8`, `p = 1`, with
 * `maxmem` raised to 256 MiB, which that cost still requires). Argon2id is therefore both the
 * preferred algorithm and the cheaper one here, and it is what this product writes.
 *
 * **Why scrypt is still read.** The stored value is a PHC-style string, so the parameters travel
 * with the hash. Verification dispatches on the algorithm the string names, and the scrypt shape
 * stays readable so a hash written by an older or a fallback derivation still verifies rather
 * than locking a person out. Nothing in this module writes a scrypt hash.
 *
 * **Rehash.** `passwordNeedsRehash` reports whether a stored string was written with the current
 * parameters. D2 keeps the branch present and unreachable: the constants are fixed, a unit test
 * pins them, and the dedicated `platform.rehash_password` function D2 describes is added only
 * when a parameter change actually ships. Nothing in this sub-PRD calls a rehash, because going
 * through `platform.set_password` would revoke every one of the person's other sessions, which a
 * parameter upgrade does not justify.
 *
 * Nothing here logs, returns, or throws a plaintext password, a salt, or a derived key.
 */

export const ARGON2ID_PARAMETERS = Object.freeze({
  algorithm: "argon2id" as const,
  /** OWASP Argon2id baseline: 19 MiB of memory, expressed in KiB as `node:crypto` wants it. */
  memoryKibibytes: 19_456,
  passes: 2,
  parallelism: 1,
  tagLengthBytes: 32,
  saltLengthBytes: 16,
});

export const MAXIMUM_PASSWORD_LENGTH = 128;

export class PasswordHashError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PasswordHashError";
  }
}

const ARGON2ID_PATTERN =
  /^\$argon2id\$v=19\$m=(\d{4,7}),t=(\d{1,3}),p=(\d{1,3})\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/u;
const SCRYPT_PATTERN =
  /^\$scrypt\$ln=(\d{1,2}),r=(\d{1,3}),p=(\d{1,3})\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{86})$/u;

/**
 * D2. Unicode-normalized to NFC so the same visible text always derives the same key, and never
 * trimmed: a leading or trailing space is part of the password the person chose.
 */
export function normalizePassword(password: string): string {
  return password.normalize("NFC");
}

function encodeBase64(value: Buffer): string {
  return value.toString("base64").replace(/=+$/u, "");
}

function assertDerivableLength(password: string): void {
  if (password.length === 0 || password.length > MAXIMUM_PASSWORD_LENGTH) {
    // The message names the bound, never the candidate.
    throw new PasswordHashError(
      `A password must be between 1 and ${String(MAXIMUM_PASSWORD_LENGTH)} characters to derive`,
    );
  }
}

function deriveArgon2id(
  password: string,
  salt: Buffer,
  parameters: Readonly<{ memoryKibibytes: number; passes: number; parallelism: number }>,
  tagLengthBytes: number,
): Buffer {
  return Buffer.from(
    argon2Sync("argon2id", {
      message: Buffer.from(password, "utf8"),
      nonce: salt,
      parallelism: parameters.parallelism,
      tagLength: tagLengthBytes,
      memory: parameters.memoryKibibytes,
      passes: parameters.passes,
    }),
  );
}

/**
 * `maxmem` is explicit because `N = 2^17, r = 8, p = 1` exceeds the `node:crypto` default and
 * fails with `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` without it, on both Node 22 and Node 24.
 */
function deriveScrypt(
  password: string,
  salt: Buffer,
  parameters: Readonly<{ logN: number; blockSize: number; parallelism: number }>,
  keyLengthBytes: number,
): Buffer {
  return scryptSync(Buffer.from(password, "utf8"), salt, keyLengthBytes, {
    N: 2 ** parameters.logN,
    r: parameters.blockSize,
    p: parameters.parallelism,
    maxmem: 256 * 1024 * 1024,
  });
}

/** D2. The PHC string the credential column stores, parameters included. */
export function hashPassword(password: string): string {
  const normalized = normalizePassword(password);
  assertDerivableLength(normalized);
  const salt = randomBytes(ARGON2ID_PARAMETERS.saltLengthBytes);
  const tag = deriveArgon2id(
    normalized,
    salt,
    ARGON2ID_PARAMETERS,
    ARGON2ID_PARAMETERS.tagLengthBytes,
  );
  return [
    "",
    "argon2id",
    "v=19",
    `m=${String(ARGON2ID_PARAMETERS.memoryKibibytes)},t=${String(ARGON2ID_PARAMETERS.passes)},p=${String(ARGON2ID_PARAMETERS.parallelism)}`,
    encodeBase64(salt),
    encodeBase64(tag),
  ].join("$");
}

/**
 * 005B-AC-013, carried forward. The explicit length check comes first because `timingSafeEqual`
 * throws on unequal lengths, and the comparison itself is constant time over the bytes.
 */
function constantTimeEquals(left: Buffer, right: Buffer): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return timingSafeEqual(left, right);
}

/**
 * D2. Parses the stored parameters, re-derives, and compares. A string outside both shapes is
 * refused rather than thrown at, so a corrupt row is a failed sign-in and not a 500.
 */
export function verifyPassword(storedHash: string, password: string): boolean {
  const normalized = normalizePassword(password);
  if (normalized.length === 0 || normalized.length > MAXIMUM_PASSWORD_LENGTH) return false;

  const argon = ARGON2ID_PATTERN.exec(storedHash);
  if (argon !== null) {
    const expected = Buffer.from(argon[5] ?? "", "base64");
    const salt = Buffer.from(argon[4] ?? "", "base64");
    const derived = deriveArgon2id(
      normalized,
      salt,
      {
        memoryKibibytes: Number(argon[1]),
        passes: Number(argon[2]),
        parallelism: Number(argon[3]),
      },
      expected.byteLength,
    );
    return constantTimeEquals(derived, expected);
  }

  const scrypt = SCRYPT_PATTERN.exec(storedHash);
  if (scrypt !== null) {
    const expected = Buffer.from(scrypt[5] ?? "", "base64");
    const salt = Buffer.from(scrypt[4] ?? "", "base64");
    const derived = deriveScrypt(
      normalized,
      salt,
      {
        logN: Number(scrypt[1]),
        blockSize: Number(scrypt[2]),
        parallelism: Number(scrypt[3]),
      },
      expected.byteLength,
    );
    return constantTimeEquals(derived, expected);
  }

  return false;
}

/** D2. Whether a stored string was written with the parameters this module writes today. */
export function passwordNeedsRehash(storedHash: string): boolean {
  const argon = ARGON2ID_PATTERN.exec(storedHash);
  if (argon === null) return true;
  return (
    Number(argon[1]) !== ARGON2ID_PARAMETERS.memoryKibibytes ||
    Number(argon[2]) !== ARGON2ID_PARAMETERS.passes ||
    Number(argon[3]) !== ARGON2ID_PARAMETERS.parallelism
  );
}

/**
 * D2 and 006A-AC-013. The sign-in handler derives against this when no credential row exists, so
 * the unknown-email path and the wrong-password path do the same work and take the same time.
 *
 * It is a real string derived from a fixed salt and a value no person can type, so it verifies
 * against nothing and costs exactly one derivation, the same as a wrong password does.
 */
export const DUMMY_PASSWORD_HASH: string = [
  "",
  "argon2id",
  "v=19",
  `m=${String(ARGON2ID_PARAMETERS.memoryKibibytes)},t=${String(ARGON2ID_PARAMETERS.passes)},p=${String(ARGON2ID_PARAMETERS.parallelism)}`,
  encodeBase64(Buffer.alloc(ARGON2ID_PARAMETERS.saltLengthBytes, 0x5a)),
  encodeBase64(Buffer.alloc(ARGON2ID_PARAMETERS.tagLengthBytes, 0xa5)),
].join("$");

/** True when the string is one this module can parse at all. Used by the seeding script's guard. */
export function isStoredPasswordHash(value: unknown): value is string {
  return typeof value === "string" && (ARGON2ID_PATTERN.test(value) || SCRYPT_PATTERN.test(value));
}
