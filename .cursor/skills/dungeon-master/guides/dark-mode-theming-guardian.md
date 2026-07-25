# dark-mode-theming-guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `dark-mode-theming-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`ai-tools/agents/dark-mode-theming-guardian.md`](../../agents/dark-mode-theming-guardian.md)
**Weapon:** [`ai-tools/skills/dark-mode-theming-weapon/`](../../skills/dark-mode-theming-weapon/)
**Command Brief:** [`ai-tools/command-briefs/dark-mode-theming-guardian-command-brief.md`](../../../command-briefs/dark-mode-theming-guardian-command-brief.md)
**Trigger policy:** proactive

---

## Domain

`dark-mode-theming-guardian` owns the runtime theming layer for React/Next.js applications. It translates design tokens into theme-aware CSS variables, wires `next-themes` for system/manual/persisted preferences, eliminates FOWT (flash-of-wrong-theme) via blocking inline script injection, ensures SSR hydration safety, configures Tailwind v4 dark-mode via `@custom-variant`, and enables zero-JS multi-brand/white-label runtime theme swapping through CSS variable override blocks. It sits between `design-system-guardian` (token source-of-truth) and `ux-ui-guardian` (per-component visual deltas).

## Trigger phrases

Route to `dark-mode-theming-guardian` when the user says any of:

- "set up dark mode" / "add dark mode"
- "next-themes keeps flashing" / "FOWT" / "flash of wrong theme"
- "dark mode on SSR" / "suppressHydrationWarning"
- "prefers-color-scheme in Next.js"
- "CSS variable token layer" / "semantic tokens" / "dark token architecture"
- "multi-brand theming" / "white-label theme swap" / "tenant theming"
- "Tailwind v4 dark mode" / "@custom-variant dark"
- "theme persisted in localStorage"
- "mounted guard pattern" / "useTheme returns undefined"
- "color-scheme property" / "scrollbars wrong color in dark mode"

Or when the request implicitly involves the runtime theming layer (detecting OS color scheme, wiring a theme toggle, auditing dark-mode implementation).

## Do NOT route when

- The user asks to **create a color palette or pick brand colors** — route to `design-system-guardian`. This Guardian consumes tokens; it does not create them.
- The user asks **which token to use for a specific component visual state** — route to `ux-ui-guardian`. Per-component token mapping is ux-ui's territory.
- The user asks to **design the `user_preferences.theme` database schema** — route to `db-guardian`. The DB schema for server-side persisted preferences is db's domain.
- The user asks about **Tailwind config beyond `darkMode`** (spacing, typography, plugin config) — route to `ux-ui-guardian`.
- The user asks to **validate a brand/tenant value from user input** for XSS/injection safety — route to `security-guardian`.
- The user asks about **auth-gated theming** (per-user theme locked by role) — route to `auth-guardian` + `db-guardian`.

If a request straddles `dark-mode-theming-guardian` and `ux-ui-guardian`, prefer `dark-mode-theming-guardian` for token-layer and theme-provider concerns, and `ux-ui-guardian` for per-component visual decisions.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The current Next.js version and router (App Router vs. Pages Router) — script placement differs
- The current Tailwind CSS version (v3 vs. v4 config differs significantly)
- Existing `globals.css` or token file (to audit and refactor)
- Existing `ThemeProvider` setup or lack thereof
- Whether the app is single-brand or multi-brand/tenant
- Preferred persistence model: `localStorage` only, or also server-side cookie

If the router version is unclear, ask — the FOWT script placement differs materially between App Router and Pages Router.

## Outputs the Guardian produces

- **Primary:** Inline code blocks for `globals.css` (token layer), `providers.tsx` (ThemeProvider), `layout.tsx` (FOWT placement), and optionally `theme-toggle.tsx`
- **Secondary:** A structured markdown audit report (at `docs/theming-audit-{date}.md` when the user requests it to be saved)
- **Checklist:** FOWT verification checklist and the six-directive sign-off

## Multi-Guardian sequences this Guardian participates in

- **Design system bring-up:** `design-system-guardian` (creates token source-of-truth) → `dark-mode-theming-guardian` (splits into `:root`/`.dark` runtime layer) → `ux-ui-guardian` (steady-state per-component visual work)
- **New site bring-up:** `website-guardian` (scaffolds the site) → `dark-mode-theming-guardian` (wires dark mode) → `ux-ui-guardian` (component visual polish)
- **Plan execution close-out:** After implementation, `security-guardian` reviews CSS variable injection paths → `quality-guardian` verifies against the plan

## Critical directives the orchestrator should respect

- Never let `dark-mode-theming-guardian` emit raw hex values in component code — all color references must be CSS variables.
- Ensure the FOWT-prevention script is always placed at the top of `<body>` (via `ThemeProvider` in `layout.tsx`), not deep in the component tree.
- Do not invoke this Guardian to design DB schemas or validate user-controlled input — those handoffs must be made explicitly.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`ai-tools/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
