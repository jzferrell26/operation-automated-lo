# 07 — Portrait Ergonomics (Thumb Zones)

Drift is portrait-friendly mobile (`CLAUDE.md` §1). The control layout is governed by where thumbs can comfortably reach on a one- or two-handed portrait grip. This is design-with-constraints; the *final* pixel tuning is the human's (`CLAUDE.md` §7).

## The thumb-reach model

On a portrait phone held in two hands (thumbs on screen), the screen divides into reach zones:

- **Natural (easy) zones** — the **bottom-left** and **bottom-right** arcs, within a thumb's swing from where it rests at the bottom corners. Primary controls live here.
- **Stretch zone** — the vertical center and mid-height edges; reachable but requires regripping. Secondary controls.
- **Hard zone** — the **top** third, especially top-center. Requires a hand shift. **No interactive control belongs here** — reserve it for non-interactive readouts (status meters).

Canonical Drift layout:

| Zone | Control |
|---|---|
| Bottom-left (natural) | Virtual joystick (floating origin within this quadrant) — `03` |
| Bottom-right (natural) | Action buttons: Attack (largest/central), Interact, Build — `05` |
| Bottom-center (stretch) | Context actions (extract / repair prompts) when present |
| Top (hard) | **Read-only** vitals: Health, O2, Suit Power — never a button |

This maps onto the existing HUD intent: `Tier0Hud` draws vitals (`DrawVitals` — Health/O2/Suit) and the loadout in side panels; the touch HUD will move them to the top/non-interactive region while the bottom corners become the control zones. The IMGUI gray-box (`Tier0Hud.OnGUI`) is placeholder — the shipping touch layout reorganizes around thumb zones.

## Safe areas and notches

Phones have notches, punch-holes, rounded corners, and gesture bars. Use `Screen.safeArea` to inset the control anchors so the joystick base and the bottom action cluster are not under the home-indicator/gesture bar and not clipped by rounded corners. A control half-under the gesture bar steals touches to the OS. Anchor on-screen controls to safe-area-adjusted rects, not raw `Screen.width/height`. Source: Unity Manual — *Device Simulator* / `Screen.safeArea`.

## Anchoring, not absolute positioning

Anchor controls to corners (Canvas `RectTransform` anchors) so they hold position across aspect ratios (tall 20:9 phones vs. 4:3 tablets). The joystick anchors bottom-left, the action cluster bottom-right, vitals top. Never lay out at fixed pixel coordinates — that's the IMGUI gray-box's job, not the shipping HUD.

## One-handed reachability (flag for design)

Some players hold a phone one-handed (thumb of the holding hand). True one-handed play of an action game is hard; if the design wants it, the **floating joystick** (spawns under the thumb wherever it lands in the left half — `03`) plus large bottom-edge action buttons is the most reachable. Whether to support one-handed is a **design call** — surface it, don't decide it.

## Occlusion: the thumb covers the screen

A resting thumb hides the bottom corners. Keep critical *feedback* (the thing you need to see while acting) out from under the thumbs — e.g. the enemy you're attacking and your vitals should not be in the bottom-left/right corners where the thumbs sit. This couples to `game-feel-juice-guardian` (readability of feedback) — coordinate.

## Sizes are feel

Button diameter, joystick radius, inter-button spacing, and the safe-area inset padding are **feel/tuning**. Ship recommended starts (button ~`64–88` px, comfortable spacing) as `[SerializeField] private` and flag "human to tune." Apple HIG and Material guidance suggest ~`44–48` px as a *minimum* touch target — use that as the floor, not the answer. Source: platform HIG / Material touch-target guidance (named, not a substitute for the human's device tuning).

## Findings to watch for

- **An interactive control in the top (hard) zone** → unreachable in one-handed/portrait grip. Should-refactor.
- **Controls positioned with raw `Screen` coords, no `safeArea` inset** → clipped/under the gesture bar on notched devices. Must-fix on device.
- **Fixed-pixel layout** instead of anchored RectTransforms → breaks on other aspect ratios. Should-refactor.
- **Touch targets below the ~44 px floor** → mis-taps. Should-refactor.
- **Critical feedback under the thumbs** → readability. Coordinate with game-feel-juice-guardian.
