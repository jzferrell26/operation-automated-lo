# Font pipeline

Owner: `typography-font-guardian`, applied by `ux-ui-guardian`.

## The ruling: Inter, vendored unmodified (PRD-009a, 2026-10-01)

The product's interface font is Inter, the font of the light AutomatedRE look the owner chose
(PRD-009 OD-E; design `00-direction.md` section 2.2). This folder holds the upstream variable
file and its licence, both unmodified, and `apps/web/src/app/globals.css` declares one
`@font-face` for the family `Inter` from `/fonts/`, with `font-display: swap` and the variable
weight range. Nothing is fetched from a third party at runtime: the browser gate in
`tests/browser/ui-foundation-ux.spec.ts` aborts every request whose origin is not the
application, and it passes with the font served from the application origin.

The earlier Geist ruling (recorded 2026-09-19 for PRD-006d, 006D-AC-004, kept below under
"History") is superseded on 2026-10-01 by PRD-009a. No Geist binary was ever vendored, so Geist
never rendered in production; the product fell through to the system sans until this file landed.

## Provenance

Taken once from the upstream git tree of `github.com/rsms/inter` at a release tag, as PRD-009's
scope contract authorizes. The files were downloaded by their tag commit, so the bytes are the
bytes of that tree and not of a release archive.

Release tag: `v4.1`

Tag commit: `e3a3d4c57d5ecc01453a575621882a384c1995a3`

Downloaded: 2026-10-01

### Vendored files

The git blob SHA-1 is SHA-1 over `blob <byte length>`, a zero byte, then the bytes; it is the
value `gh api 'repos/rsms/inter/contents/<path>?ref=v4.1'` reports as `sha`. The SHA-256 is over
the bytes alone.

| File | Upstream path | Bytes | Git blob SHA-1 | SHA-256 |
| --- | --- | --- | --- | --- |
| `InterVariable.woff2` | `docs/font-files/InterVariable.woff2` | 352,240 | `5a8d3e72ad7ffb62af3b146e1b1f54ab5813a212` | `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3` |
| `LICENSE.txt` | `LICENSE.txt` | 4,380 | `9b2ca37b3ffc77391d8b2ebef4a974ef32bf46ea` | `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a` |

`apps/web/src/theme/font-files.unit.test.ts` recomputes both identities of both files from the
bytes on disk and fails on any difference from this table.

### What was checked, and how

1. `gh api repos/rsms/inter/git/refs/tags/v4.1` names commit
   `e3a3d4c57d5ecc01453a575621882a384c1995a3` (a lightweight tag on a commit).
2. `gh api 'repos/rsms/inter/contents/docs/font-files/InterVariable.woff2?ref=v4.1'` reports
   size 352,240 and sha `5a8d3e72ad7ffb62af3b146e1b1f54ab5813a212`;
   `gh api 'repos/rsms/inter/contents/LICENSE.txt?ref=v4.1'` reports size 4,380 and sha
   `9b2ca37b3ffc77391d8b2ebef4a974ef32bf46ea`.
3. Both files were downloaded from
   `https://raw.githubusercontent.com/rsms/inter/e3a3d4c57d5ecc01453a575621882a384c1995a3/<path>`,
   and `git hash-object` over each downloaded file reproduced the two shas above.
4. The release API, `gh api repos/rsms/inter/releases/tags/v4.1`, reports `digest: null` for the
   release archive `Inter-4.1.zip`, so no archive digest is relied on anywhere in this record.

### Licence

`LICENSE.txt` is the SIL Open Font License, Version 1.1, "Copyright (c) 2016 The Inter Project
Authors", with no Reserved Font Name. It was re-read in the exact tree vendored here. The font is
redistributed unmodified beside it, which the licence permits.

### Not subset, on purpose

The variable file is about 352 KB and covers more than Latin. PRD-009a's Non-Goals forbid
subsetting or otherwise modifying the font, so the file stays as upstream ships it. A later change
that wants a smaller file subsets from this same tag and records the new identities here.

## History: the Geist ruling of 2026-09-19 (superseded on 2026-10-01)

Recorded for PRD-006d, 006D-AC-004. It shipped the token stack with `"Geist"` and `"Geist Mono"`
declared first and the system faces behind them, because no Geist binary or licence could be
vendored in that batch, and it set the rule this folder still follows: no `@font-face` ships
without its licence file beside the binary, and nothing is fetched from a third party. PRD-009a
replaces Geist with Inter (design `00-direction.md` section 2.2) and keeps both rules.
