import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SUPPORT_DETAILS_LABELS,
  SUPPORT_REFERENCE_NOT_RECORDED,
} from "../../../copy/user-language.js";
import { stubRefusedFetch } from "../../http/refusal.test-support.js";
import { userMessageSentence } from "../../http/user-messages.js";
import { fillAndSaveOpenHouseDraft } from "./open-house-draft.test-support.js";
import { OpenHouseDraftBuilder } from "./open-house-draft-builder.js";

/**
 * PRD-006b 006B-AC-007 on the create screen.
 *
 * This screen has shown a support row since the row existed, but the value in it was the failure's
 * own code, under a label that says "Support reference". Support looks a request up by the
 * reference the route puts on the response (`apps/web/src/server/campaign-preflight-handler.ts:31`),
 * not by the name of the failure, so a person who read that row aloud was giving support something
 * it cannot search. All four surfaces that can show this row now mean the same thing by it.
 */

const SUPPORT_REFERENCE = "correlation_preflight_2b7e04c1a95d38f6e0a1b2c3";

function save(): void {
  fillAndSaveOpenHouseDraft({ realtorName: "Priya Nadeem" });
}

describe("the create screen when the checks route refuses", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("puts the route's own reference in the support row, not the failure's name", async () => {
    stubRefusedFetch("CAMPAIGN_UNCHARTED_REFUSAL", SUPPORT_REFERENCE);
    render(<OpenHouseDraftBuilder />);

    save();

    const region = await screen.findByRole("alert");
    expect(region).toHaveTextContent(userMessageSentence(undefined));
    expect(screen.getByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_REFERENCE)).toBeInTheDocument();
    expect(screen.queryByText("CAMPAIGN_UNCHARTED_REFUSAL")).toBeNull();
  });

  it("shows the mapped sentence and no reference for a code it knows", async () => {
    stubRefusedFetch("INVALID_CAMPAIGN_DRAFT", SUPPORT_REFERENCE);
    render(<OpenHouseDraftBuilder />);

    save();

    const region = await screen.findByRole("alert");
    expect(region).toHaveTextContent(userMessageSentence("INVALID_CAMPAIGN_DRAFT"));
    expect(screen.queryByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeNull();
  });

  it("says the reference was not recorded when the refusal carried none", async () => {
    stubRefusedFetch(undefined, undefined);
    render(<OpenHouseDraftBuilder />);

    save();

    expect(await screen.findByText(SUPPORT_REFERENCE_NOT_RECORDED)).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeInTheDocument();
  });
});
