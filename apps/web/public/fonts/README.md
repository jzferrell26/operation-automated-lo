# Font pipeline

Ruling recorded 2026-09-19 for PRD-006d, 006D-AC-004. Owner: `typography-font-guardian`,
applied by `ux-ui-guardian`.

## The ruling: the token stack, not a vendored Geist, in this batch

The design brief section 10 names Geist for the interface and Geist Mono for data,
identifiers, versions, hashes, and timestamps, and section 10 line 172 requires that
production delivery be self-hosted or go through the application font pipeline. The
browser gate in `tests/browser/ui-foundation-ux.spec.ts` aborts every request whose
origin is not the application, so a Google Fonts link or any other third-party fetch is
not an option and never will be.

Self-hosting needs three things in the repository: the font binaries, the licence file,
and an `@font-face` block. None of the three can be produced in this batch:

- No Geist or Geist Mono binary exists anywhere in the repository or in the installed
  dependency tree. Verified on 2026-09-19 by searching the worktree for `.woff2`,
  `.woff`, `.ttf`, and `.otf` files: there are none.
- The toolchain installs with `--frozen-lockfile --offline`, and PRD-006d forbids a new
  dependency without cause, so the `geist` package cannot be added here.
- A font file may not be fetched from a third party, and a licence may not be asserted
  from memory. The brief and PRD-006d both require the licence file to sit beside the
  binaries before any `@font-face` ships.

So this batch ships the token stack. `--font-interface` and `--font-data` in
`packages/ui/src/tokens.css` already declare `"Geist"` and `"Geist Mono"` first and fall
through to the system sans and system monospace faces. `apps/web/src/app/globals.css`
now consumes those tokens instead of its own local `Inter, ui-sans-serif, system-ui`
stack, which is what 006D-AC-004 requires. Nothing is fetched at runtime, so the browser
gate stays green, and the declared family order means a later vendored Geist starts
rendering everywhere with no further change to any screen.

## What the follow-up lane does

1. Obtain the Geist and Geist Mono variable builds from the upstream release and put
   them in this folder as `geist-latin.woff2` and `geist-mono-latin.woff2`, subset to
   Latin.
2. Put the upstream licence file in this folder as `LICENSE.txt`, unmodified.
3. Add the `@font-face` blocks below to `apps/web/src/app/globals.css`, with
   `font-display: swap` and the variable weight range, and nothing else:

   ```css
   @font-face {
     font-family: "Geist";
     src: url("/fonts/geist-latin.woff2") format("woff2-variations");
     font-weight: 400 700;
     font-style: normal;
     font-display: swap;
   }

   @font-face {
     font-family: "Geist Mono";
     src: url("/fonts/geist-mono-latin.woff2") format("woff2-variations");
     font-weight: 400 700;
     font-style: normal;
     font-display: swap;
   }
   ```

4. Re-run the browser gate and confirm that no request leaves the application origin,
   then regenerate the visual baselines, because glyph metrics will move.

Until step 2 is done, no `@font-face` is added. A font without its licence beside it does
not ship.
