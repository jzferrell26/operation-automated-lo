import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-006d 006D-AC-013. A screen baseline never moves without somebody saying why.
 *
 * A picture that changed "because the test was failing" is a design defect being committed, and it
 * is the easiest kind to commit by accident: the suite goes green, nobody looks at the diff, and
 * the product drifts one screen at a time. So the rule is that a pull request touching
 * `tests/visual/screens/` carries a line naming the intended visual change, and this fails the
 * pull request when it does not.
 *
 * The open question in PRD-006d asked whether this should be a unit test over the pull request
 * body or a continuous-integration step reading `gh pr view`. It is this: a unit test that reads
 * the changed files from git and the note from the pull request body when the body is available
 * (`PR_BODY`, which the workflow passes through from `github.event.pull_request.body`), and that
 * checks the template still carries the marker otherwise. That keeps the rule enforceable on a
 * developer's machine, where there is no pull request yet, and binding in continuous integration,
 * where there is.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const BASELINE_DIRECTORY = "tests/visual/screens/";
const NOTE_MARKER = "Baseline change:";
const TEMPLATE_PATH = ".github/pull_request_template.md";

/** The files this branch changes against its merge base, or an empty list outside a pull request. */
function changedFiles(): readonly string[] {
  const base = process.env["GITHUB_BASE_REF"];
  if (base === undefined || base === "") return [];
  try {
    const output = execFileSync("git", ["diff", "--name-only", `origin/${base}...HEAD`], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
  } catch {
    // No merge base to compare against. The template assertion below still runs, so the rule is
    // never silently switched off; it simply has nothing branch-specific to say.
    return [];
  }
}

/** The text that follows the marker in the pull request body, trimmed. */
function baselineNote(body: string): string {
  const index = body.indexOf(NOTE_MARKER);
  if (index === -1) return "";
  return (
    body
      .slice(index + NOTE_MARKER.length)
      .split(/\r?\n\s*(?:#{1,6}\s|<!--)/u)[0]
      ?.trim()
      .replace(/^<!--[\s\S]*?-->/u, "")
      .trim() ?? ""
  );
}

describe("the screen baseline note", () => {
  it("is asked for by the pull request template, so nobody has to remember the rule", () => {
    const template = readFileSync(join(repositoryRoot, TEMPLATE_PATH), "utf8");
    expect(template).toContain(NOTE_MARKER);
    expect(template).toContain(BASELINE_DIRECTORY);
  });

  it("is present whenever this branch moves a screen baseline", () => {
    const changed = changedFiles();
    const movedBaselines = changed.filter(
      (file) => file.startsWith(BASELINE_DIRECTORY) && file.endsWith(".png"),
    );
    if (movedBaselines.length === 0) return;

    const body = process.env["PR_BODY"] ?? "";
    expect(
      body,
      `This branch changes ${String(movedBaselines.length)} screen baseline(s) and no pull request body was available to check. Set PR_BODY in the workflow.`,
    ).not.toEqual("");

    const note = baselineNote(body);
    expect(
      note,
      `These baselines moved with no note saying why:\n${movedBaselines.join("\n")}\nAdd the intended visual change after "${NOTE_MARKER}" in the pull request body.`,
    ).not.toEqual("");
  });
});
