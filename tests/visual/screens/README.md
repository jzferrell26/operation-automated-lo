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

Text rasterises differently on every platform, so a baseline only means something on the platform
that drew it. **Every committed baseline is drawn by the `ubuntu-24.04` runner, and the comparison
runs only where `CI` is set, which is that same runner.** A developer machine, whatever its
operating system, skips the comparison instead of failing on rasterisation; the axe, keyboard,
motion, and target-size checks in the same specs still run. Set `OALO_COMPARE_SCREEN_BASELINES=true`
to compare anyway (a Linux machine with the runner's fonts is the only place that is useful).

### Regenerating

`.github/workflows/screen-baselines.yml` runs both suites on the runner in write mode and hands the
pictures back as two artifacts. Nothing in the workflow commits.

1. Run it: `gh workflow run screen-baselines.yml --ref <branch>` (it also runs once on any push to
   a non-main branch that changes the workflow file itself).
2. Wait for both jobs: `gh run watch <run-id>`.
3. Download into place:
   `gh run download <run-id> -n screen-baselines-chromium -D tests/visual/screens/chromium` and
   `gh run download <run-id> -n screen-baselines-review -D tests/visual/screens/review`.
4. Read the diff of every picture that changed against the rubric, then commit them with the
   `Baseline change:` line the pull request template asks for.

### Capturing without touching a baseline

`OALO_SCREEN_SNAPSHOT_DIR=<directory outside the repository>` with
`OALO_UPDATE_SCREEN_BASELINES=all` writes every picture both suites take into that directory
instead of here, on any platform. This is how the D9 sign-off in
`docs/operations/evidence-packs/design-quality-signoff.md` gets a real set of screenshots of the
final tree: `pnpm test:browser` for the synthetic screens and `pnpm test:db` for the account screens
and the guided setup, with both variables set. The pictures stay outside git.

## Changing a baseline

A baseline diff is a visual change to the product, so 006D-AC-013 asks for one extra thing: the
pull request body says which change it is, in the `ux-ui-guardian` checklist item of
`.github/pull_request_template.md`. `tooling/tests/unit/design-quality/baseline-note.test.ts`
fails a pull request whose baselines moved without that line.

A baseline that changed "because the test was failing" is a defect being committed. Read the diff
image in `test-results/`, decide whether the new picture is on brief against
`library/knowledge/private/ux-ui/06-review-rubric.md`, and either fix the screen or record the
intended change.
