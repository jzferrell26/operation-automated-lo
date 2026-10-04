import { describe, expect, it } from "vitest";

import * as route from "./route.js";

/**
 * PRD-009b D4 and 009B-AC-011. `POST /api/setup/progress` answers 404.
 *
 * The route used to store the floating walkthrough's progress. The walkthrough is retired and nothing
 * writes progress any more, but a request to the removed address does not fall off the end of the
 * router: the workspace's catch-all page answers every unknown path, and it answers 200 carrying its
 * own not-found page, because the response has begun streaming before it can say otherwise. A removed
 * write route that answers 200 reads as one that still works, so the address says what is true:
 * nothing is here. The handler reads no body, no session, and no database.
 */

function request(method: string): Request {
  return new Request("https://oalo.local/api/setup/progress", {
    method,
    headers: { "content-type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify({ progress: { status: "in_progress" } }) }),
  });
}

describe("the retired progress route (009B-AC-011)", () => {
  it("answers POST with 404 and no body", async () => {
    const response = await route.POST(request("POST"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it.each(["GET", "PUT", "PATCH", "DELETE"] as const)(
    "answers %s with 404 as well",
    async (method) => {
      const response = await route[method](request(method));

      expect(response.status).toBe(404);
    },
  );

  it("tells no cache to keep the answer, so the address cannot appear to come back", async () => {
    const response = await route.POST(request("POST"));

    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("exports nothing but the five method handlers", () => {
    expect(Object.keys(route).toSorted()).toEqual(["DELETE", "GET", "PATCH", "POST", "PUT"]);
  });
});
