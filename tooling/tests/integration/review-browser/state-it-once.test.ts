import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  connectionStatements,
  connectionStatementsOutsideTheSetupCard,
  repeatedConnectionStatements,
} from "../../../../apps/web/src/features/overview/components/connection-statements.test-support.js";
import {
  CONNECTION_SHAPES,
  KNOWN_CONNECTION_SENTENCES,
  connectionStatementsInDocument,
} from "../../../../tests/browser/helpers/connection-statements-in-page.js";
import {
  repeatedStatements,
  statementsOutsideTheSetupCard,
} from "../../../../tests/browser/helpers/state-it-once.js";

/**
 * PRD-009g D2 and 009G-AC-009. The browser suites read "stated once" with
 * `connectionStatementsInDocument`, which has to be a standalone copy of the algorithm in
 * `connection-statements.test-support.ts` because Playwright serialises the function it evaluates
 * and cannot import the original. A copy drifts, and a drifted reader would hold a page to something
 * other than what the component suites hold it to while looking like the same check. These cases run
 * both against the same documents.
 *
 * They are not identical readers, on purpose. The component helper was written before the writing
 * review of 2026-10-02 and recognises the older shapes ("not connected", "isn't connected"); the
 * browser one also recognises "needs Meta connected" and "until Meta and HighLevel are connected",
 * which the review's wording uses. So the first case asks that the browser reader finds everything
 * the component reader finds, and the second that it finds the review's sentences too.
 */

beforeAll(() => {
  // jsdom has no `checkVisibility`, and a document that is not laid out has nothing to hide.
  Object.defineProperty(Element.prototype, "checkVisibility", {
    configurable: true,
    value(this: Element) {
      return this.closest("[hidden]") === null;
    },
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

function read() {
  return connectionStatementsInDocument({
    known: [...KNOWN_CONNECTION_SENTENCES],
    shapes: [...CONNECTION_SHAPES],
  });
}

/**
 * The "Get set up" card as the first-run Home renders it (markup copied from the synthetic server on
 * 2026-10-02, with the icons, classes, and ids left out): the card's one sentence, then three items,
 * two of them carrying the short state "Not connected yet". The component helper reads this through
 * the card's `data-home="setup"` and the state's `data-checklist-state`, as it does on the real page.
 */
const HOME = `
  <main>
    <p>Welcome, Alex.</p>
    <section data-home="start"><h1>Launch an ad</h1><p>Pick a ready-made Facebook ad for loan officers.</p></section>
    <section aria-labelledby="home-setup-title" data-home="setup">
      <h2 id="home-setup-title">Get set up</h2>
      <p>You can set up an ad now. Launching it on Facebook isn't turned on yet, and it needs HighLevel and Meta connected.</p>
      <ul>
        <li data-item="highlevel"><h3>Connect HighLevel</h3><p>New leads from your ads go to your HighLevel account.</p><span data-checklist-state="not_connected">Not connected yet</span><a href="/settings/connections">See what's needed</a></li>
        <li data-item="meta"><h3>Connect Meta</h3><p>Your Facebook page and ad account. Meta needs both before an ad can launch.</p><span data-checklist-state="not_connected">Not connected yet</span><a href="/settings/connections">See what's needed</a></li>
        <li data-item="brand"><h3>Add your brand</h3><p>Your name and NMLS number. They go on every ad automatically.</p><span data-checklist-state="not_started">Not started</span><a href="/brand">Add</a></li>
      </ul>
    </section>
    <section aria-label="Running now"><h2>Running now</h2><p>No ads running</p></section>
  </main>`;

/** A page that says one sentence twice, once of them outside the card, in the older wording. */
const SAID_TWICE = `
  <main>
    <section data-home="setup"><p>HighLevel and Meta aren't connected.</p></section>
    <p>HighLevel and Meta aren't connected.</p>
    <p>Nothing else to say.</p>
  </main>`;

describe("the browser reader of connection sentences", () => {
  it("finds on Home everything the component reader finds, and nothing outside the card", () => {
    document.body.innerHTML = HOME;
    const component = connectionStatements(document.body).map((statement) => statement.text);
    const browser = read();

    // The component reader takes the two items' titles ("Connect HighLevel", "Connect Meta") for
    // statements, because its shapes include "connect HighLevel"; a title is a name for an action
    // and not a sentence that says a connection is missing (D2), so the browser reader leaves it
    // out. It also treats a checklist state as a state, as the browser reader does, and does not
    // know the review's wording of the card's own sentence, which the browser reader finds.
    expect(component).toEqual(["Connect HighLevel", "Connect Meta"]);
    expect(browser.map((statement) => statement.text)).toEqual([
      "Launching it on Facebook isn't turned on yet, and it needs HighLevel and Meta connected.",
      "Not connected yet",
      "Not connected yet",
    ]);
    expect(statementsOutsideTheSetupCard(browser)).toEqual([]);
    expect(repeatedStatements(browser)).toEqual([]);
  });

  it("agrees with the component reader on what is repeated and what is outside the card", () => {
    document.body.innerHTML = SAID_TWICE;
    const component = connectionStatements(document.body).map((statement) => statement.text);
    const browser = read();

    for (const sentence of component) {
      expect(browser.map((statement) => statement.text)).toContain(sentence);
    }
    expect(
      repeatedStatements(browser).map((entry) => entry.replace(/ \(said \d+ times\)$/u, "")),
    ).toEqual(repeatedConnectionStatements(document.body));
    expect(statementsOutsideTheSetupCard(browser)).toEqual(
      connectionStatementsOutsideTheSetupCard(document.body),
    );
  });

  it("reads the two items' short states once each, and the card's own sentence once", () => {
    document.body.innerHTML = HOME;
    const browser = read();

    const states = browser.filter((statement) => statement.text === "Not connected yet");
    expect(states).toHaveLength(2);
    expect(new Set(states.map((statement) => statement.item)).size).toBe(2);
    expect(
      browser.filter((statement) => /needs HighLevel and Meta connected/u.test(statement.text)),
    ).toHaveLength(1);
  });

  it("finds the sentences the writing review wrote, which the older shapes do not", () => {
    document.body.innerHTML = `
      <main>
        <p>Launching on Facebook isn't turned on yet, and it needs Meta connected. <a href="/settings/connections">See what's needed for Meta</a>.</p>
        <p>Not live yet. Spend and leads can't show here until Meta and HighLevel are connected.</p>
        <p>Your HighLevel account. It isn't connected yet.</p>
      </main>`;

    expect(read().map((statement) => statement.text)).toEqual([
      "Launching on Facebook isn't turned on yet, and it needs Meta connected.",
      "Spend and leads can't show here until Meta and HighLevel are connected.",
      "It isn't connected yet.",
    ]);
  });

  it("does not count 'Not live yet' on a result figure, or the sentence a connection sentence sits beside", () => {
    document.body.innerHTML = `
      <main>
        <p>Spend</p><p>Not live yet</p>
        <p>You can set up an ad now. Launching it on Facebook isn't turned on yet, and it needs HighLevel and Meta connected.</p>
      </main>`;

    expect(read().map((statement) => statement.text)).toEqual([
      "Launching it on Facebook isn't turned on yet, and it needs HighLevel and Meta connected.",
    ]);
  });

  it("reports a sentence said twice, and lets two items each carry one short state", () => {
    document.body.innerHTML = `
      <main>
        <p>HighLevel and Meta aren't connected.</p>
        <section><p>HighLevel and Meta aren't connected.</p></section>
        <ul>
          <li>Connect HighLevel <span>Not connected yet</span></li>
          <li>Connect Meta <span>Not connected yet</span></li>
        </ul>
      </main>`;

    expect(repeatedStatements(read())).toEqual([
      "highlevel and meta aren't connected. (said 2 times)",
    ]);
  });

  it("flags a short state said twice inside one item, and a free-floating one said twice", () => {
    document.body.innerHTML = `
      <main>
        <ul><li>Connect Meta <span>Not connected yet</span> <span>Not connected yet</span></li></ul>
        <p>Not connected yet</p><p>Not connected yet</p>
      </main>`;

    expect(repeatedStatements(read())).toEqual([
      "not connected yet | item 1 (said 2 times)",
      "not connected yet (said 2 times)",
    ]);
  });

  it("leaves out what a person does not see: support details, a closed region, scripts", () => {
    document.body.innerHTML = `
      <main>
        <details data-support-details><summary>Details for support</summary><p>HighLevel isn't connected.</p></details>
        <div hidden><p>Meta isn't connected.</p></div>
        <script>"HighLevel isn't connected."</script>
        <p>Nothing else to say.</p>
      </main>`;

    expect(read()).toEqual([]);
  });

  it("knows the sentences the copy files carry, so a reworded one is tracked by its own file", () => {
    expect(KNOWN_CONNECTION_SENTENCES).toContain("Not connected yet");
    expect(KNOWN_CONNECTION_SENTENCES).toContain("It isn't connected yet.");
    expect(KNOWN_CONNECTION_SENTENCES).toContain(
      "Launching on Facebook isn't turned on yet, and it needs Meta connected.",
    );
    // A sentence beside a connection sentence in the same entry is not one itself.
    expect(KNOWN_CONNECTION_SENTENCES).not.toContain("Not live yet.");
    expect(KNOWN_CONNECTION_SENTENCES).not.toContain("You can set up an ad now.");
  });
});
