import { describe, expect, it } from "vitest";

import { labelForStatus, toneForStatus } from "./status-tone.js";

/**
 * The scored review's R2 N-5c gave each status chip a tone and a glyph; the writing review delta
 * check's D-8 gives it plain sentence-case words. The data keeps its own lowercase words, and the
 * chip says these.
 */
describe("the words a status chip says (writing review delta check, D-8)", () => {
  it("says the three statuses the demo data has in sentence case and plain words", () => {
    expect(labelForStatus("approved")).toBe("Approved");
    expect(labelForStatus("superseded")).toBe("Replaced");
    expect(labelForStatus("connected")).toBe("Connected");
  });

  it("says a status the data adds later in sentence case, with its underscores as spaces", () => {
    expect(labelForStatus("authorized")).toBe("Authorized");
    expect(labelForStatus("not_connected")).toBe("Not connected");
  });

  it("never answers with something that is not a string for a word that is on the object prototype", () => {
    expect(labelForStatus("constructor")).toBe("Constructor");
    expect(labelForStatus("toString")).toBe("ToString");
  });

  it("leaves the tone to the data's own word, so a chip's colour does not move with its words", () => {
    expect(toneForStatus("approved")).toBe("success");
    expect(toneForStatus("connected")).toBe("success");
    expect(toneForStatus("superseded")).toBe("neutral");
  });
});
