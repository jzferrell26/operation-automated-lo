import { vi } from "vitest";

import { SUPPORT_REFERENCE_HEADER } from "./internal-api.js";

/**
 * A `fetch` that refuses, the way a route refuses.
 *
 * Four screens can show PRD-006b D7's generic sentence, and each of them has to be held to the
 * same three cases: a code the product has words for, a code it does not, and an answer that
 * carried no reference at all. Written out four times that is four chances for one screen to be
 * tested against a refusal shaped slightly differently from the one the routes actually send.
 *
 * The header is the one `correlation-boundary.ts` sets on every answer it makes, success or
 * refusal, so a stub that omits it is standing in for a route that is out of contract.
 */
export function stubRefusedFetch(
  code: string | undefined,
  reference: string | undefined,
  status = 400,
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(code === undefined ? {} : { error: code }), {
          status,
          headers: {
            "content-type": "application/json",
            ...(reference === undefined ? {} : { [SUPPORT_REFERENCE_HEADER]: reference }),
          },
        }),
    ),
  );
}

/** A `fetch` that never answers, for the case where nothing reached a route at all. */
export function stubUnreachedFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("network down");
    }),
  );
}
