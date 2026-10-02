import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextWithDays } from "./text-with-days.js";

/**
 * Every date is a `time` element (PRD-008d, 009a). Copy says a sentence as one string, and this
 * draws it with each day inside a `time` element and the rest as the text it was.
 */
describe("a sentence with days in it", () => {
  it("draws each day as a time element with its machine value, and keeps the words around them", () => {
    const { container } = render(
      <p>
        <TextWithDays
          days={[
            { dateTime: "2026-10-06", text: "Tue, Oct 6, 2026" },
            { dateTime: "2026-10-20", text: "Tue, Oct 20, 2026" },
          ]}
          text="Runs from Tue, Oct 6, 2026 until Tue, Oct 20, 2026, in Austin, TX."
        />
      </p>,
    );

    const times = [...container.querySelectorAll("time")];
    expect(times.map((time) => [time.getAttribute("datetime"), time.textContent])).toEqual([
      ["2026-10-06", "Tue, Oct 6, 2026"],
      ["2026-10-20", "Tue, Oct 20, 2026"],
    ]);
    expect(container.textContent).toBe(
      "Runs from Tue, Oct 6, 2026 until Tue, Oct 20, 2026, in Austin, TX.",
    );
  });

  it("finds the same written day twice, in order, once for each", () => {
    const { container } = render(
      <p>
        <TextWithDays
          days={[
            { dateTime: "2026-10-06", text: "Oct 6" },
            { dateTime: "2026-10-06", text: "Oct 6" },
          ]}
          text="Oct 6 to Oct 6"
        />
      </p>,
    );

    expect(container.querySelectorAll("time")).toHaveLength(2);
    expect(container.textContent).toBe("Oct 6 to Oct 6");
  });

  it("leaves the sentence as it was when it does not hold the day, and when there are no days", () => {
    const { container } = render(
      <p>
        <TextWithDays
          days={[{ dateTime: "2026-10-06", text: "Oct 6" }]}
          text="Until further notice"
        />
        {" / "}
        <TextWithDays days={[]} text="Nothing to count yet" />
      </p>,
    );

    expect(container.querySelectorAll("time")).toHaveLength(0);
    expect(container.textContent).toBe("Until further notice / Nothing to count yet");
  });
});
