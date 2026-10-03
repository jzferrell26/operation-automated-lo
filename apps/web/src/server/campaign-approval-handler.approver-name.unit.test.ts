import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDefaultCampaignCommandPorts,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { handleCampaignApproval, resolveApproverDisplayName } from "./campaign-approval-handler.js";
import { createTemporaryCampaignStore } from "./campaign-command-test-support.js";

/**
 * PRD-009e D2, 009E-AC-004. The route records the decider's own session display name in the
 * decision's evidence, read through the same scoped function that names the signed-in person in the
 * shell, and from nowhere else: the request body has no field for it, so a request that carries one
 * is refused before anything runs.
 *
 * The command itself is stood in for here, so each case sees exactly what the route handed it; the
 * decision it records is proved against a real database in `campaign-approval-handler.approver-name.postgres.test.ts`.
 */

const handed = vi.hoisted(() => ({ inputs: [] as unknown[] }));
vi.mock("@oalo/application", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/application")>()),
  executeHumanCampaignApproval: vi.fn(async (input: unknown) => {
    handed.inputs.push(input);
    return { kind: "denied" as const };
  }),
}));

const store = createTemporaryCampaignStore("oalo-approver-name-");

afterEach(async () => {
  handed.inputs.length = 0;
  await store.restore();
});

type DisplayRead = NonNullable<CampaignCommandPorts["sessionDisplay"]>["resolve"];

function portsWith(resolve: DisplayRead | undefined): CampaignCommandPorts {
  return {
    ...createDefaultCampaignCommandPorts(),
    ...(resolve === undefined ? {} : { sessionDisplay: { resolve } }),
  };
}

function approveRequest(body: unknown): Request {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const BODY = { campaignRef: "campaign_approvername001", decision: "approved" } as const;

async function nameHandedFor(resolve: DisplayRead | undefined): Promise<unknown> {
  await store.enter();
  await handleCampaignApproval(approveRequest(BODY), store.env(), portsWith(resolve));
  expect(handed.inputs).toHaveLength(1);
  return (handed.inputs[0] as { approverDisplayName: unknown }).approverDisplayName;
}

function display(name: string) {
  return async () => ({ locationDisplayName: "Prairie Home Lending", userDisplayName: name });
}

describe("the approval route and the decider's own name", () => {
  it("hands the command the name the signed-in person's own session read yields", async () => {
    expect(await nameHandedFor(display("Casey Rivera"))).toBe("Casey Rivera");
  });

  it("asks the session read about the signed-in person alone, never about anybody the request names", async () => {
    const resolve = vi.fn(display("Casey Rivera"));

    await nameHandedFor(resolve);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith({
      locationRef: "location_localWorkspace001",
      actorRef: "principal_localUser001",
    });
  });

  it("trims the name and cuts one over the 200 characters a display name can hold", async () => {
    expect(await nameHandedFor(display("  Casey Rivera  "))).toBe("Casey Rivera");
    handed.inputs.length = 0;
    await store.restore();
    expect(await nameHandedFor(display("A".repeat(300)))).toBe("A".repeat(200));
  });

  it.each([
    ["only the fallback the shell shows", display("You")],
    ["a blank name", display("   ")],
    ["no answer at all", async () => undefined],
    [
      "a read that fails",
      async () => {
        throw new Error("the database is unreachable");
      },
    ],
  ])("records nothing when the session read yields %s", async (_case, resolve) => {
    expect(await nameHandedFor(resolve)).toBeUndefined();
  });

  it("records nothing when the deployment has no session display port", async () => {
    expect(await nameHandedFor(undefined)).toBeUndefined();
  });

  it("refuses a request that carries a name, before anything runs, because the name comes only from the session", async () => {
    await store.enter();
    const resolve = vi.fn(display("Casey Rivera"));

    const response = await handleCampaignApproval(
      approveRequest({ ...BODY, approverDisplayName: "Somebody Else" }),
      store.env(),
      portsWith(resolve),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "INVALID_CAMPAIGN_COMMAND",
      issues: [{ code: "unrecognized_keys", keys: ["approverDisplayName"] }],
    });
    expect(handed.inputs).toHaveLength(0);
    expect(resolve).not.toHaveBeenCalled();
  });
});

describe("resolveApproverDisplayName", () => {
  const principal = {
    locationRef: "location_a",
    actorRef: "principal_a",
  } as Parameters<typeof resolveApproverDisplayName>[1];

  it("answers the name, cut at 200 characters by code point so no character is split", async () => {
    const emoji = "\u{1F600}".repeat(250);

    const name = await resolveApproverDisplayName(portsWith(display(emoji)), principal);

    expect([...(name ?? "")]).toHaveLength(200);
    expect(name).toBe("\u{1F600}".repeat(200));
  });

  it("answers nothing for a person who typed the fallback word as their own name", async () => {
    expect(await resolveApproverDisplayName(portsWith(display("You")), principal)).toBeUndefined();
  });
});
