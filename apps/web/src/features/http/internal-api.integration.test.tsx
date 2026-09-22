import { createSessionBoundCsrfToken } from "@oalo/auth";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CSRF_META_NAME, CSRF_REQUEST_HEADER, postInternalJson } from "./internal-api.js";

/**
 * PRD-005a 005A-AC-012. The browser helper reads the token from the server-rendered meta element
 * that the authenticated layout emits, and sends it on every mutation. The element carries
 * `createSessionBoundCsrfToken` output; the `__Host-oalo_session` cookie is `HttpOnly` and never
 * reaches the document at all.
 */

const SERVER_SECRET = new Uint8Array(32).fill(7);
const SESSION_REF = "session_0c9a5b1e4d2f4a7b9c3d1e2f3a4b5c6d";

function renderCsrfMeta(content: string): void {
  const element = document.createElement("meta");
  element.setAttribute("name", CSRF_META_NAME);
  element.setAttribute("content", content);
  document.head.append(element);
}

afterEach(() => {
  document.head.querySelectorAll(`meta[name="${CSRF_META_NAME}"]`).forEach((node) => {
    node.remove();
  });
  vi.unstubAllGlobals();
});

describe("postInternalJson CSRF header", () => {
  it("sends the rendered token verbatim on a mutation", async () => {
    const token = createSessionBoundCsrfToken({
      serverSecret: SERVER_SECRET,
      sessionId: SESSION_REF,
    });
    renderCsrfMeta(token);
    const network = vi.fn(async (_input: string, _init?: RequestInit) => {
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", network);

    await postInternalJson("/api/campaigns/approve", { campaignRef: "campaign_probe001" });

    const headers = network.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined;
    expect(headers?.[CSRF_REQUEST_HEADER]).toBe(token);
    expect(headers?.["content-type"]).toBe("application/json");
  });

  it.each([
    ["the page rendered no meta element", undefined],
    ["the rendered token is empty", ""],
  ])("sends no CSRF header when %s", async (_label, rendered) => {
    if (rendered !== undefined) renderCsrfMeta(rendered);
    const network = vi.fn(async (_input: string, _init?: RequestInit) => {
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", network);

    await postInternalJson("/api/campaigns/preflight", {});

    const headers = network.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined;
    expect(headers?.[CSRF_REQUEST_HEADER]).toBeUndefined();
  });

  it("never sends a cookie header from script", async () => {
    renderCsrfMeta(
      createSessionBoundCsrfToken({ serverSecret: SERVER_SECRET, sessionId: SESSION_REF }),
    );
    const network = vi.fn(async (_input: string, _init?: RequestInit) => {
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", network);

    await postInternalJson("/api/campaigns/approve", {});

    const headers = network.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined;
    expect(Object.keys(headers ?? {})).toEqual(["content-type", CSRF_REQUEST_HEADER]);
  });
});
