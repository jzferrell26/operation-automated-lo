# Screen baselines

PRD-006d D8 and acceptance criterion 006D-AC-012. One committed picture per screen, frame, theme,
and named state from the rubric's section 4, compared on every run by Playwright's
`toHaveScreenshot`.

## These are not the rendering goldens

Two directories under `tests/visual/` hold pictures of different things, and confusing them wastes
a reviewer's afternoon.

| Directory | What it holds | What fails it | Who owns a change |
| --- | --- | --- | --- |
| `tests/visual/rendering/` | Byte-level canonical JSON for the public artifact renderer, compared by the `visual` vitest project. | A change to what the renderer emits for a given input. | The rendering lane. |
| `tests/visual/screens/` | PNG screenshots of product screens, compared by the Playwright browser suite. | A change to how a screen looks: a spacing token, a colour role, a type step, a state. | `ux-ui-guardian`, in the same pull request. |

A rendering golden answers "does the renderer still produce this document". A screen baseline
answers "does this screen still look the way the design brief says".

## Naming

`<screen>--<state>--<frame>--<theme>.png`, for example
`campaign-create--default--390--dark.png`. The frame is one of `1440`, `1180`, `768`, `390`, which
are design brief section 14's four frames. The theme is `light` or `dark`. The state is `default`
unless the rubric names one, in which case it is that name in lower case with hyphens.

The project directory in between (`chromium/` for the synthetic screens, `review/` for the account
screens and the guided-setup steps) comes from `snapshotPathTemplate` in `playwright.config.ts`.

## Where they run

- **Synthetic screens** (overview, campaigns, create, campaign detail, reports, onboarding,
  settings and connections, brand, email preview): `pnpm test:browser`, which `pnpm verify:offline`
  runs.
- **Account screens and the seven guided-setup steps**: the `review` project inside `pnpm test:db`,
  which starts the disposable database, the seeded people, and the TLS terminator that the
  `__Host-` session cookie requires.

## Platform

**The baselines currently committed here were generated on Windows and must be regenerated on the
`ubuntu-24.04` runner before they gate anything.**

Playwright appends the platform to a baseline's name, so a Windows baseline and a Linux baseline
are different files and never silently compare against each other. Text rasterises differently on
each platform, so a Windows baseline will not pass on Linux however small the tolerance is.

To regenerate on the runner:

```
pnpm test:browser --update-snapshots
```

Run it on a `ubuntu-24.04` job, commit only the `-linux.png` files it writes, and delete the
`-win32.png` files in the same commit. A macOS or Windows developer machine compares
informationally and must never commit a baseline.

## Changing a baseline

A baseline diff is a visual change to the product, so 006D-AC-013 asks for one extra thing: the
pull request body says which change it is, in the `ux-ui-guardian` checklist item of
`.github/pull_request_template.md`. `tooling/tests/unit/design-quality/baseline-note.test.ts`
fails a pull request whose baselines moved without that line.

A baseline that changed "because the test was failing" is a defect being committed. Read the diff
image in `test-results/`, decide whether the new picture is on brief against
`library/knowledge/private/ux-ui/06-review-rubric.md`, and either fix the screen or record the
intended change.
