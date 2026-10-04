import { describe, expect, it } from "vitest";

import { adsShownStatus, topicInSentence } from "./ads-library-messages.js";
import { TOPIC_LABELS } from "./launch-messages.js";

/**
 * PRD-009 writing review pass 1, W-21. The status line a screen reader hears after a topic chip
 * filters the library. The topic sits in the middle of a sentence, so it is not capitalized there.
 */
describe("the library's status line", () => {
  it("says how many ads show, with the topic in the middle of the sentence", () => {
    expect(adsShownStatus(2, "Refinance")).toBe("Showing 2 ads about refinance.");
    expect(adsShownStatus(3, "First-time buyers")).toBe("Showing 3 ads about first-time buyers.");
    expect(adsShownStatus(1, "VA loans")).toBe("Showing 1 ad about VA loans.");
    expect(adsShownStatus(4, "Pre-approval")).toBe("Showing 4 ads about pre-approval.");
    expect(adsShownStatus(2, "Down payment help")).toBe("Showing 2 ads about down payment help.");
  });

  it("says all of them when no topic is chosen", () => {
    expect(adsShownStatus(8, undefined)).toBe("Showing all 8 ads.");
    expect(adsShownStatus(1, undefined)).toBe("Showing all 1 ad.");
  });

  it("lower-cases a topic's first letter unless the topic starts with an acronym", () => {
    expect(topicInSentence("Refinance")).toBe("refinance");
    expect(topicInSentence("VA loans")).toBe("VA loans");
    expect(topicInSentence("already lower")).toBe("already lower");
    expect(topicInSentence("")).toBe("");
  });

  it('never leaves a capital after "about" for any of the five topics, except an acronym', () => {
    for (const label of Object.values(TOPIC_LABELS)) {
      const sentence = adsShownStatus(2, label);
      const topic = sentence.replace(/^Showing 2 ads about /u, "").replace(/\.$/u, "");
      expect(topic, label).toBe(label.startsWith("VA") ? label : label.toLocaleLowerCase("en-US"));
    }
  });
});
