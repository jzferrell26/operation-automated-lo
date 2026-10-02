/**
 * PRD-009b 009B-AC-008, "state it once". What a page says about a connection not being made, and
 * where.
 *
 * On 2026-10-01 a brand-new account's Home said "HighLevel, Meta, and Stripe aren't connected" 16
 * times and showed nine "Not connected" metrics (PRD-009 index, Problem). The rule that replaced it
 * is that Home says it in one place, the "Get set up" card, and nowhere else. This reads a rendered
 * page the way a person does and reports every sentence that says a connection is missing, so a test
 * can assert both halves: every such sentence is inside the card, and no sentence is said twice.
 *
 * It is a test helper and not product code, and 009G's "state it once" test (Wave 4) reuses it for
 * the pages that survive.
 *
 * A checklist item's state label ("Not connected yet") is a state, glyph plus words, not a
 * sentence, and each item has exactly one, so those labels are not statements: the two items would
 * otherwise read as a repeat of each other, which is the one repeat the design wants. They are
 * marked `data-checklist-state` by the card.
 */

const CONNECTION_SAID = [
  /\bnot\s+connected\b/iu,
  /\b(?:isn|aren)['’]t\s+connected\b/iu,
  /\bnot\s+live\s+yet\b/iu,
  /\bnothing\s+(?:here\s+)?is\s+connected\b/iu,
  /\bconnect\s+(?:HighLevel|Meta|your\s+accounts?)\b/iu,
];

export type ConnectionStatement = Readonly<{
  /** The sentence, trimmed and with its inner spacing collapsed. */
  text: string;
  /** True when it sits inside the element marked `data-home="setup"`, the "Get set up" card. */
  insideSetupCard: boolean;
}>;

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.replace(/\s+/gu, " ").trim())
    .filter((sentence) => sentence.length > 0);
}

/** Every sentence under `root` that says a connection is missing, in document order. */
export function connectionStatements(root: ParentNode): readonly ConnectionStatement[] {
  const found: ConnectionStatement[] = [];
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent === null || parent.closest("script, style, [data-checklist-state]") !== null) {
      continue;
    }
    for (const sentence of sentencesOf(node.textContent ?? "")) {
      if (CONNECTION_SAID.some((pattern) => pattern.test(sentence))) {
        found.push({
          text: sentence,
          insideSetupCard: parent.closest('[data-home="setup"]') !== null,
        });
      }
    }
  }
  return found;
}

/** Sentences the page says more than once, which is what "state it once" forbids. */
export function repeatedConnectionStatements(root: ParentNode): readonly string[] {
  const seen = new Map<string, number>();
  for (const statement of connectionStatements(root)) {
    const key = statement.text.toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen].filter(([, count]) => count > 1).map(([text]) => text);
}

/** Sentences about a missing connection that are not inside the "Get set up" card. */
export function connectionStatementsOutsideTheSetupCard(root: ParentNode): readonly string[] {
  return connectionStatements(root)
    .filter((statement) => !statement.insideSetupCard)
    .map((statement) => statement.text);
}
