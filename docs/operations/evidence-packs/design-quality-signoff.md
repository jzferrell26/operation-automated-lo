# Design quality sign-off

PRD-006d D9 and acceptance criterion 006D-AC-015, re-signed for PRD-008d (008D-AC-010 and
008D-AC-011) and again for PRD-009g (009G-AC-007). **Status: SIGNED.** `ux-ui-guardian` prepared the
skeleton; the orchestrator filled it in from real screenshots of the running application and signed
it on 2026-09-21. On 2026-10-01 `ux-ui-guardian` re-signed every row against the PRD-008d tree, twice.
On 2026-10-03 `ux-ui-guardian` re-signed the whole table against the PRD-009 tree, from the
baselines the `ubuntu-24.04` runner drew for it (see "How this was filled").

- Commit reviewed: the commit that installs the baselines drawn by screen-baselines run 37163215460
  from `ee03945a`
  - Nothing rendered changed between `ee03945a` and that commit: `git diff --name-only ee03945a
    4511100d` lists documentation, `EXECUTION_LEDGER.md`, and `apps/web/src/app/globals.css`, whose
    only change is a path inside a comment.
- Date: 2026-10-04 (first signed 2026-09-21 against `74999a8`; re-signed against `d7af15a` and
  `cad9bf6` on 2026-10-01, and against run 37157590605's pictures on 2026-10-03)
- Signed by: `ux-ui-guardian`, Gauntlet PRD-009 Wave 4, for the orchestrator

The reviewers' own screenshots, contact sheets, and crops are retained outside git. They are large,
and none of them is needed to read the result: the table below is the result, and every picture it
names is a committed baseline under `tests/visual/screens/`. Every screenshot contains only
synthetic data or the seeded review people, never a real address, a real name, a form with a value
somebody typed, a cookie store, or developer tools. For PRD-009 that means two things. The Ads
library, the launch steps, and the campaign pictures show the labelled sample ads, the sample
catalog that only a local or review run switches on (the samples flag named in
`docs/production-environments.md`, which a deployment never sets), drawn with their SAMPLE art; the real-catalog pictures show none. And every account in a picture is one of the review run's
`@oalo.invalid` accounts: the three seeded people (`review-creator@`, `review-approver@`, and
`review-outsider@`) and the fresh `review-<run>@oalo.invalid` accounts the run signs up (the brand-new
account's pages come from the one `tests/browser/review/empty-account.spec.ts` signs up and reuses).
The synthetic server's pictures carry its own "Local demo with sample data." line.

## How to fill this in

1. **Draw the pictures once.** `.github/workflows/screen-baselines.yml` draws both suites on the
   `ubuntu-24.04` runner. 009G-AC-004 allows one dispatch for the whole change set and any later one
   only under 009G-AC-011. Download its two artifacts into `tests/visual/screens/chromium/` and
   `tests/visual/screens/review/`, as `tests/visual/screens/README.md` says.
2. **Build the rows from the files, not from memory.** List what is installed, group it by
   `<screen>--<state>`, and give each group a row. A screen PRD-009 removed keeps its row and reads
   "Removed by PRD-009 on 2026-10-03".
3. **Name the picture in every cell.** The cell holds the file under `tests/visual/screens/`, for
   example `review/home--first-run--1440--light.png`. A frame a state does not have reads "frame not
   drawn", and the reason is in "Frames a state does not have". No cell reads "not photographed" or
   "asserted".
4. **Score.** The scored review (009G-AC-006) scores every picture on the rubric's ten axes, 0 to 3,
   and the bar is 3 on every axis (`library/knowledge/private/ux-ui/06-review-rubric.md`, section 1).
   A row is signed when every picture it names clears that bar there. A fix after the dispatch that
   changes a picture re-opens that picture under 009G-AC-011, and this table is re-signed.
5. **Check the table against the disk.** From the repository root, this prints a line for each
   picture the table names that is not on disk, then the number of distinct pictures the table names
   and the number missing, then the number of pictures installed.

   ```
   named=0; missing=0
   for f in $(grep -o '`[a-z]*/[a-z0-9-]*--[0-9]*--[a-z]*\.png`' docs/operations/evidence-packs/design-quality-signoff.md | tr -d '`' | sort -u); do
     named=$((named+1)); [ -f "tests/visual/screens/$f" ] || { echo "missing $f"; missing=$((missing+1)); }
   done; echo "$named named, $missing missing"
   ls tests/visual/screens/chromium tests/visual/screens/review | grep -c '\.png$'
   ```

   The number named and the number installed match when every installed picture has a row, and the
   number missing is 0 when every row's picture exists.

The ten axes are the rubric's, in `library/knowledge/private/ux-ui/06-review-rubric.md` section 2:
1 hierarchy, 2 spacing rhythm, 3 typography, 4 colour and contrast, 5 states, 6 motion,
7 responsiveness, 8 dark and light, 9 empty and error states, 10 consistency with the PRD-009
mockups.

## The table

Each row is one screen in one named state. Each of the eight cells names the picture of that frame
(1440, 1180, 768, 390) and theme (L is Light, D is Dark) under `tests/visual/screens/`, or reads
"frame not drawn", with the reason under "Frames a state does not have". Server is the project that
drew the picture: `synthetic` is the `chromium/` folder and `review` is the `review/` folder. A row
is signed when every picture it names scores 3 on every one of the ten axes in the scored review.
Rows for screens PRD-009 removed read "Removed by PRD-009 on 2026-10-03" and stay as history, in the
last table.

### Account screens

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sign in | default | review | `review/sign-in--default--1440--light.png` | `review/sign-in--default--1440--dark.png` | `review/sign-in--default--1180--light.png` | `review/sign-in--default--1180--dark.png` | `review/sign-in--default--768--light.png` | `review/sign-in--default--768--dark.png` | `review/sign-in--default--390--light.png` | `review/sign-in--default--390--dark.png` |
| Sign in | signed out | review | `review/sign-in--signed-out--1440--light.png` | `review/sign-in--signed-out--1440--dark.png` | `review/sign-in--signed-out--1180--light.png` | `review/sign-in--signed-out--1180--dark.png` | `review/sign-in--signed-out--768--light.png` | `review/sign-in--signed-out--768--dark.png` | `review/sign-in--signed-out--390--light.png` | `review/sign-in--signed-out--390--dark.png` |
| Sign in | refused | review | `review/sign-in--refused--1440--light.png` | `review/sign-in--refused--1440--dark.png` | `review/sign-in--refused--1180--light.png` | `review/sign-in--refused--1180--dark.png` | `review/sign-in--refused--768--light.png` | `review/sign-in--refused--768--dark.png` | `review/sign-in--refused--390--light.png` | `review/sign-in--refused--390--dark.png` |
| Choose workspace | default | review | `review/choose-workspace--default--1440--light.png` | `review/choose-workspace--default--1440--dark.png` | `review/choose-workspace--default--1180--light.png` | `review/choose-workspace--default--1180--dark.png` | `review/choose-workspace--default--768--light.png` | `review/choose-workspace--default--768--dark.png` | `review/choose-workspace--default--390--light.png` | `review/choose-workspace--default--390--dark.png` |
| Sign up | default | review | `review/sign-up--default--1440--light.png` | `review/sign-up--default--1440--dark.png` | `review/sign-up--default--1180--light.png` | `review/sign-up--default--1180--dark.png` | `review/sign-up--default--768--light.png` | `review/sign-up--default--768--dark.png` | `review/sign-up--default--390--light.png` | `review/sign-up--default--390--dark.png` |
| Sign up | address already has an account | review | `review/sign-up--address-already-has-an-account--1440--light.png` | `review/sign-up--address-already-has-an-account--1440--dark.png` | `review/sign-up--address-already-has-an-account--1180--light.png` | `review/sign-up--address-already-has-an-account--1180--dark.png` | `review/sign-up--address-already-has-an-account--768--light.png` | `review/sign-up--address-already-has-an-account--768--dark.png` | `review/sign-up--address-already-has-an-account--390--light.png` | `review/sign-up--address-already-has-an-account--390--dark.png` |
| Forgot password | default | review | `review/forgot-password--default--1440--light.png` | `review/forgot-password--default--1440--dark.png` | `review/forgot-password--default--1180--light.png` | `review/forgot-password--default--1180--dark.png` | `review/forgot-password--default--768--light.png` | `review/forgot-password--default--768--dark.png` | `review/forgot-password--default--390--light.png` | `review/forgot-password--default--390--dark.png` |
| Forgot password | confirmation | review | `review/forgot-password--confirmation--1440--light.png` | `review/forgot-password--confirmation--1440--dark.png` | `review/forgot-password--confirmation--1180--light.png` | `review/forgot-password--confirmation--1180--dark.png` | `review/forgot-password--confirmation--768--light.png` | `review/forgot-password--confirmation--768--dark.png` | `review/forgot-password--confirmation--390--light.png` | `review/forgot-password--confirmation--390--dark.png` |
| Reset password | default | review | `review/reset-password--default--1440--light.png` | `review/reset-password--default--1440--dark.png` | `review/reset-password--default--1180--light.png` | `review/reset-password--default--1180--dark.png` | `review/reset-password--default--768--light.png` | `review/reset-password--default--768--dark.png` | `review/reset-password--default--390--light.png` | `review/reset-password--default--390--dark.png` |
| Reset password | link expired | review | `review/reset-password--link-expired--1440--light.png` | `review/reset-password--link-expired--1440--dark.png` | `review/reset-password--link-expired--1180--light.png` | `review/reset-password--link-expired--1180--dark.png` | `review/reset-password--link-expired--768--light.png` | `review/reset-password--link-expired--768--dark.png` | `review/reset-password--link-expired--390--light.png` | `review/reset-password--link-expired--390--dark.png` |
| Reset password | saved (the person lands on Home under the saved-password notice) | review | `review/reset-password--saved-notice--1440--light.png` | `review/reset-password--saved-notice--1440--dark.png` | `review/reset-password--saved-notice--1180--light.png` | `review/reset-password--saved-notice--1180--dark.png` | `review/reset-password--saved-notice--768--light.png` | `review/reset-password--saved-notice--768--dark.png` | `review/reset-password--saved-notice--390--light.png` | `review/reset-password--saved-notice--390--dark.png` |
| Verify email | default | review | `review/verify-email--default--1440--light.png` | `review/verify-email--default--1440--dark.png` | `review/verify-email--default--1180--light.png` | `review/verify-email--default--1180--dark.png` | `review/verify-email--default--768--light.png` | `review/verify-email--default--768--dark.png` | `review/verify-email--default--390--light.png` | `review/verify-email--default--390--dark.png` |
| Verify email | confirmed | review | `review/verify-email--confirmed--1440--light.png` | `review/verify-email--confirmed--1440--dark.png` | `review/verify-email--confirmed--1180--light.png` | `review/verify-email--confirmed--1180--dark.png` | `review/verify-email--confirmed--768--light.png` | `review/verify-email--confirmed--768--dark.png` | `review/verify-email--confirmed--390--light.png` | `review/verify-email--confirmed--390--dark.png` |
| Verify email | link expired | review | `review/verify-email--link-expired--1440--light.png` | `review/verify-email--link-expired--1440--dark.png` | `review/verify-email--link-expired--1180--light.png` | `review/verify-email--link-expired--1180--dark.png` | `review/verify-email--link-expired--768--light.png` | `review/verify-email--link-expired--768--dark.png` | `review/verify-email--link-expired--390--light.png` | `review/verify-email--link-expired--390--dark.png` |
| Change password | default | review | `review/change-password--default--1440--light.png` | `review/change-password--default--1440--dark.png` | `review/change-password--default--1180--light.png` | `review/change-password--default--1180--dark.png` | `review/change-password--default--768--light.png` | `review/change-password--default--768--dark.png` | `review/change-password--default--390--light.png` | `review/change-password--default--390--dark.png` |
| Change password | saved | review | `review/change-password--saved--1440--light.png` | `review/change-password--saved--1440--dark.png` | `review/change-password--saved--1180--light.png` | `review/change-password--saved--1180--dark.png` | `review/change-password--saved--768--light.png` | `review/change-password--saved--768--dark.png` | `review/change-password--saved--390--light.png` | `review/change-password--saved--390--dark.png` |

### The top bar and its sheets

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shell | top bar (drawn on the synthetic Home) | synthetic | `chromium/overview--default--1440--light.png` | `chromium/overview--default--1440--dark.png` | `chromium/overview--default--1180--light.png` | `chromium/overview--default--1180--dark.png` | `chromium/overview--default--768--light.png` | `chromium/overview--default--768--dark.png` | `chromium/overview--default--390--light.png` | `chromium/overview--default--390--dark.png` |
| Shell | Help sheet open | review | `review/shell--help-menu-open--1440--light.png` | `review/shell--help-menu-open--1440--dark.png` | `review/shell--help-menu-open--1180--light.png` | `review/shell--help-menu-open--1180--dark.png` | `review/shell--help-menu-open--768--light.png` | `review/shell--help-menu-open--768--dark.png` | `review/shell--help-menu-open--390--light.png` | `review/shell--help-menu-open--390--dark.png` |
| Shell | Menu sheet open (390 only) | review | frame not drawn | frame not drawn | frame not drawn | frame not drawn | frame not drawn | frame not drawn | `review/shell--menu-sheet-open--390--light.png` | `review/shell--menu-sheet-open--390--dark.png` |

### Home

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | first run (a brand-new account) | review | `review/home--first-run--1440--light.png` | `review/home--first-run--1440--dark.png` | `review/home--first-run--1180--light.png` | `review/home--first-run--1180--dark.png` | `review/home--first-run--768--light.png` | `review/home--first-run--768--dark.png` | `review/home--first-run--390--light.png` | `review/home--first-run--390--dark.png` |
| Home | first run on the real catalog (the hosted first impression) | review | `review/home--real-catalog--1440--light.png` | `review/home--real-catalog--1440--dark.png` | `review/home--real-catalog--1180--light.png` | `review/home--real-catalog--1180--dark.png` | `review/home--real-catalog--768--light.png` | `review/home--real-catalog--768--dark.png` | `review/home--real-catalog--390--light.png` | `review/home--real-catalog--390--dark.png` |
| Home | sample data (the local demo; Overview before PRD-009) | synthetic | `chromium/overview--default--1440--light.png` | `chromium/overview--default--1440--dark.png` | `chromium/overview--default--1180--light.png` | `chromium/overview--default--1180--dark.png` | `chromium/overview--default--768--light.png` | `chromium/overview--default--768--dark.png` | `chromium/overview--default--390--light.png` | `chromium/overview--default--390--dark.png` |
| Home | with campaigns | review | `review/home--with-campaigns--1440--light.png` | `review/home--with-campaigns--1440--dark.png` | `review/home--with-campaigns--1180--light.png` | `review/home--with-campaigns--1180--dark.png` | `review/home--with-campaigns--768--light.png` | `review/home--with-campaigns--768--dark.png` | `review/home--with-campaigns--390--light.png` | `review/home--with-campaigns--390--dark.png` |
| Home | under the unverified-email notice (1440 Light and 390 Light only) | synthetic | `chromium/design-surfaces--home-under-notice--1440--light.png` | frame not drawn | frame not drawn | frame not drawn | frame not drawn | frame not drawn | `chromium/design-surfaces--home-under-notice--390--light.png` | frame not drawn |

### Ads library

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ads library | all ads | review | `review/ads-library--all--1440--light.png` | `review/ads-library--all--1440--dark.png` | `review/ads-library--all--1180--light.png` | `review/ads-library--all--1180--dark.png` | `review/ads-library--all--768--light.png` | `review/ads-library--all--768--dark.png` | `review/ads-library--all--390--light.png` | `review/ads-library--all--390--dark.png` |
| Ads library | one topic | review | `review/ads-library--one-topic--1440--light.png` | `review/ads-library--one-topic--1440--dark.png` | `review/ads-library--one-topic--1180--light.png` | `review/ads-library--one-topic--1180--dark.png` | `review/ads-library--one-topic--768--light.png` | `review/ads-library--one-topic--768--dark.png` | `review/ads-library--one-topic--390--light.png` | `review/ads-library--one-topic--390--dark.png` |
| Ads library | empty (the real catalog, which ships empty) | review | `review/ads-library--real-catalog--1440--light.png` | `review/ads-library--real-catalog--1440--dark.png` | `review/ads-library--real-catalog--1180--light.png` | `review/ads-library--real-catalog--1180--dark.png` | `review/ads-library--real-catalog--768--light.png` | `review/ads-library--real-catalog--768--dark.png` | `review/ads-library--real-catalog--390--light.png` | `review/ads-library--real-catalog--390--dark.png` |

### Launch an ad

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Launch an ad, step 1 | all ads | review | `review/launch-an-ad--step-1-all--1440--light.png` | `review/launch-an-ad--step-1-all--1440--dark.png` | `review/launch-an-ad--step-1-all--1180--light.png` | `review/launch-an-ad--step-1-all--1180--dark.png` | `review/launch-an-ad--step-1-all--768--light.png` | `review/launch-an-ad--step-1-all--768--dark.png` | `review/launch-an-ad--step-1-all--390--light.png` | `review/launch-an-ad--step-1-all--390--dark.png` |
| Launch an ad, step 1 | filtered to one topic | review | `review/launch-an-ad--step-1-filtered--1440--light.png` | `review/launch-an-ad--step-1-filtered--1440--dark.png` | `review/launch-an-ad--step-1-filtered--1180--light.png` | `review/launch-an-ad--step-1-filtered--1180--dark.png` | `review/launch-an-ad--step-1-filtered--768--light.png` | `review/launch-an-ad--step-1-filtered--768--dark.png` | `review/launch-an-ad--step-1-filtered--390--light.png` | `review/launch-an-ad--step-1-filtered--390--dark.png` |
| Launch an ad, step 1 | empty (the real catalog, no ad to choose) | review | `review/launch-an-ad--step-1-real-catalog--1440--light.png` | `review/launch-an-ad--step-1-real-catalog--1440--dark.png` | `review/launch-an-ad--step-1-real-catalog--1180--light.png` | `review/launch-an-ad--step-1-real-catalog--1180--dark.png` | `review/launch-an-ad--step-1-real-catalog--768--light.png` | `review/launch-an-ad--step-1-real-catalog--768--dark.png` | `review/launch-an-ad--step-1-real-catalog--390--light.png` | `review/launch-an-ad--step-1-real-catalog--390--dark.png` |
| Launch an ad, step 2 | first campaign, the area still empty | review | `review/launch-an-ad--step-2-first-campaign--1440--light.png` | `review/launch-an-ad--step-2-first-campaign--1440--dark.png` | `review/launch-an-ad--step-2-first-campaign--1180--light.png` | `review/launch-an-ad--step-2-first-campaign--1180--dark.png` | `review/launch-an-ad--step-2-first-campaign--768--light.png` | `review/launch-an-ad--step-2-first-campaign--768--dark.png` | `review/launch-an-ad--step-2-first-campaign--390--light.png` | `review/launch-an-ad--step-2-first-campaign--390--dark.png` |
| Launch an ad, step 3 | needs changes | review | `review/launch-an-ad--step-3-needs-changes--1440--light.png` | `review/launch-an-ad--step-3-needs-changes--1440--dark.png` | `review/launch-an-ad--step-3-needs-changes--1180--light.png` | `review/launch-an-ad--step-3-needs-changes--1180--dark.png` | `review/launch-an-ad--step-3-needs-changes--768--light.png` | `review/launch-an-ad--step-3-needs-changes--768--dark.png` | `review/launch-an-ad--step-3-needs-changes--390--light.png` | `review/launch-an-ad--step-3-needs-changes--390--dark.png` |
| Launch an ad, step 3 | ready for approval | review | `review/launch-an-ad--step-3-ready-for-approval--1440--light.png` | `review/launch-an-ad--step-3-ready-for-approval--1440--dark.png` | `review/launch-an-ad--step-3-ready-for-approval--1180--light.png` | `review/launch-an-ad--step-3-ready-for-approval--1180--dark.png` | `review/launch-an-ad--step-3-ready-for-approval--768--light.png` | `review/launch-an-ad--step-3-ready-for-approval--768--dark.png` | `review/launch-an-ad--step-3-ready-for-approval--390--light.png` | `review/launch-an-ad--step-3-ready-for-approval--390--dark.png` |
| Launch an ad, step 3 | approved | review | `review/launch-an-ad--step-3-approved--1440--light.png` | `review/launch-an-ad--step-3-approved--1440--dark.png` | `review/launch-an-ad--step-3-approved--1180--light.png` | `review/launch-an-ad--step-3-approved--1180--dark.png` | `review/launch-an-ad--step-3-approved--768--light.png` | `review/launch-an-ad--step-3-approved--768--dark.png` | `review/launch-an-ad--step-3-approved--390--light.png` | `review/launch-an-ad--step-3-approved--390--dark.png` |
| Launch an ad, step 3 | sent back | review | `review/launch-an-ad--step-3-sent-back--1440--light.png` | `review/launch-an-ad--step-3-sent-back--1440--dark.png` | `review/launch-an-ad--step-3-sent-back--1180--light.png` | `review/launch-an-ad--step-3-sent-back--1180--dark.png` | `review/launch-an-ad--step-3-sent-back--768--light.png` | `review/launch-an-ad--step-3-sent-back--768--dark.png` | `review/launch-an-ad--step-3-sent-back--390--light.png` | `review/launch-an-ad--step-3-sent-back--390--dark.png` |
| Launch an ad, step 3 | ad retired | review | `review/launch-an-ad--step-3-ad-retired--1440--light.png` | `review/launch-an-ad--step-3-ad-retired--1440--dark.png` | `review/launch-an-ad--step-3-ad-retired--1180--light.png` | `review/launch-an-ad--step-3-ad-retired--1180--dark.png` | `review/launch-an-ad--step-3-ad-retired--768--light.png` | `review/launch-an-ad--step-3-ad-retired--768--dark.png` | `review/launch-an-ad--step-3-ad-retired--390--light.png` | `review/launch-an-ad--step-3-ad-retired--390--dark.png` |
| Launch an ad, step 3 | ready for approval, the viewer cannot approve (the hand-off) | review | `review/launch-an-ad--step-3-cannot-approve--1440--light.png` | `review/launch-an-ad--step-3-cannot-approve--1440--dark.png` | `review/launch-an-ad--step-3-cannot-approve--1180--light.png` | `review/launch-an-ad--step-3-cannot-approve--1180--dark.png` | `review/launch-an-ad--step-3-cannot-approve--768--light.png` | `review/launch-an-ad--step-3-cannot-approve--768--dark.png` | `review/launch-an-ad--step-3-cannot-approve--390--light.png` | `review/launch-an-ad--step-3-cannot-approve--390--dark.png` |

### The campaign page

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Campaign page | approved | review | `review/campaign-page--approved--1440--light.png` | `review/campaign-page--approved--1440--dark.png` | `review/campaign-page--approved--1180--light.png` | `review/campaign-page--approved--1180--dark.png` | `review/campaign-page--approved--768--light.png` | `review/campaign-page--approved--768--dark.png` | `review/campaign-page--approved--390--light.png` | `review/campaign-page--approved--390--dark.png` |
| Campaign page | sent back | review | `review/campaign-page--sent-back--1440--light.png` | `review/campaign-page--sent-back--1440--dark.png` | `review/campaign-page--sent-back--1180--light.png` | `review/campaign-page--sent-back--1180--dark.png` | `review/campaign-page--sent-back--768--light.png` | `review/campaign-page--sent-back--768--dark.png` | `review/campaign-page--sent-back--390--light.png` | `review/campaign-page--sent-back--390--dark.png` |
| Campaign page | library notice (the Brand changed after the version was saved) | review | `review/campaign-page--library-notice--1440--light.png` | `review/campaign-page--library-notice--1440--dark.png` | `review/campaign-page--library-notice--1180--light.png` | `review/campaign-page--library-notice--1180--dark.png` | `review/campaign-page--library-notice--768--light.png` | `review/campaign-page--library-notice--768--dark.png` | `review/campaign-page--library-notice--390--light.png` | `review/campaign-page--library-notice--390--dark.png` |
| Campaign page | a newer version of the ad exists | review | `review/campaign-page--newer-version--1440--light.png` | `review/campaign-page--newer-version--1440--dark.png` | `review/campaign-page--newer-version--1180--light.png` | `review/campaign-page--newer-version--1180--dark.png` | `review/campaign-page--newer-version--768--light.png` | `review/campaign-page--newer-version--768--dark.png` | `review/campaign-page--newer-version--390--light.png` | `review/campaign-page--newer-version--390--dark.png` |
| Campaign page | ad retired | review | `review/campaign-page--ad-retired--1440--light.png` | `review/campaign-page--ad-retired--1440--dark.png` | `review/campaign-page--ad-retired--1180--light.png` | `review/campaign-page--ad-retired--1180--dark.png` | `review/campaign-page--ad-retired--768--light.png` | `review/campaign-page--ad-retired--768--dark.png` | `review/campaign-page--ad-retired--390--light.png` | `review/campaign-page--ad-retired--390--dark.png` |
| Campaign page | saved before PRD-009 | review | `review/campaign-page--saved-before-prd-009--1440--light.png` | `review/campaign-page--saved-before-prd-009--1440--dark.png` | `review/campaign-page--saved-before-prd-009--1180--light.png` | `review/campaign-page--saved-before-prd-009--1180--dark.png` | `review/campaign-page--saved-before-prd-009--768--light.png` | `review/campaign-page--saved-before-prd-009--768--dark.png` | `review/campaign-page--saved-before-prd-009--390--light.png` | `review/campaign-page--saved-before-prd-009--390--dark.png` |
| Campaign detail | ready for approval (the approver's view) | review | `review/campaign-detail--ready--1440--light.png` | `review/campaign-detail--ready--1440--dark.png` | `review/campaign-detail--ready--1180--light.png` | `review/campaign-detail--ready--1180--dark.png` | `review/campaign-detail--ready--768--light.png` | `review/campaign-detail--ready--768--dark.png` | `review/campaign-detail--ready--390--light.png` | `review/campaign-detail--ready--390--dark.png` |
| Campaign detail | approved (the approver's view) | review | `review/campaign-detail--approved--1440--light.png` | `review/campaign-detail--approved--1440--dark.png` | `review/campaign-detail--approved--1180--light.png` | `review/campaign-detail--approved--1180--dark.png` | `review/campaign-detail--approved--768--light.png` | `review/campaign-detail--approved--768--dark.png` | `review/campaign-detail--approved--390--light.png` | `review/campaign-detail--approved--390--dark.png` |
| Campaign detail | already decided (the approver's view) | review | `review/campaign-detail--already-decided--1440--light.png` | `review/campaign-detail--already-decided--1440--dark.png` | `review/campaign-detail--already-decided--1180--light.png` | `review/campaign-detail--already-decided--1180--dark.png` | `review/campaign-detail--already-decided--768--light.png` | `review/campaign-detail--already-decided--768--dark.png` | `review/campaign-detail--already-decided--390--light.png` | `review/campaign-detail--already-decided--390--dark.png` |
| Campaign detail | permission-restricted (a creator) | synthetic | `chromium/campaign-detail--permission-restricted--1440--light.png` | `chromium/campaign-detail--permission-restricted--1440--dark.png` | `chromium/campaign-detail--permission-restricted--1180--light.png` | `chromium/campaign-detail--permission-restricted--1180--dark.png` | `chromium/campaign-detail--permission-restricted--768--light.png` | `chromium/campaign-detail--permission-restricted--768--dark.png` | `chromium/campaign-detail--permission-restricted--390--light.png` | `chromium/campaign-detail--permission-restricted--390--dark.png` |
| Campaign detail | demo campaign (unlinked; axis 10 exempt) | synthetic | `chromium/campaign-detail--default--1440--light.png` | `chromium/campaign-detail--default--1440--dark.png` | `chromium/campaign-detail--default--1180--light.png` | `chromium/campaign-detail--default--1180--dark.png` | `chromium/campaign-detail--default--768--light.png` | `chromium/campaign-detail--default--768--dark.png` | `chromium/campaign-detail--default--390--light.png` | `chromium/campaign-detail--default--390--dark.png` |

The demo campaign is scored on axes 1 to 9 only. The rubric's section 5 exempts it from axis 10, by
the dated entry "Amended 2026-10-03 by the PRD-009 scored review (R2 F-14)", which ends when a PRD
retires the route or links a PRD-009 screen to it.

### Campaigns list and the gone page

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Campaigns list | empty | synthetic | `chromium/campaigns--empty--1440--light.png` | `chromium/campaigns--empty--1440--dark.png` | `chromium/campaigns--empty--1180--light.png` | `chromium/campaigns--empty--1180--dark.png` | `chromium/campaigns--empty--768--light.png` | `chromium/campaigns--empty--768--dark.png` | `chromium/campaigns--empty--390--light.png` | `chromium/campaigns--empty--390--dark.png` |
| Campaigns list | empty (a brand-new account) | review | `review/campaigns--empty-account--1440--light.png` | `review/campaigns--empty-account--1440--dark.png` | `review/campaigns--empty-account--1180--light.png` | `review/campaigns--empty-account--1180--dark.png` | `review/campaigns--empty-account--768--light.png` | `review/campaigns--empty-account--768--dark.png` | `review/campaigns--empty-account--390--light.png` | `review/campaigns--empty-account--390--dark.png` |
| Campaigns list | populated | synthetic | `chromium/campaigns--populated--1440--light.png` | `chromium/campaigns--populated--1440--dark.png` | `chromium/campaigns--populated--1180--light.png` | `chromium/campaigns--populated--1180--dark.png` | `chromium/campaigns--populated--768--light.png` | `chromium/campaigns--populated--768--dark.png` | `chromium/campaigns--populated--390--light.png` | `chromium/campaigns--populated--390--dark.png` |
| Campaigns list | populated, every status chip | review | `review/campaigns--all-states--1440--light.png` | `review/campaigns--all-states--1440--dark.png` | `review/campaigns--all-states--1180--light.png` | `review/campaigns--all-states--1180--dark.png` | `review/campaigns--all-states--768--light.png` | `review/campaigns--all-states--768--dark.png` | `review/campaigns--all-states--390--light.png` | `review/campaigns--all-states--390--dark.png` |
| Gone page | default | review | `review/gone--default--1440--light.png` | `review/gone--default--1440--dark.png` | `review/gone--default--1180--light.png` | `review/gone--default--1180--dark.png` | `review/gone--default--768--light.png` | `review/gone--default--768--dark.png` | `review/gone--default--390--light.png` | `review/gone--default--390--dark.png` |

### Brand, Realtor partners, Homeowner reports, and Settings

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Brand | default | synthetic | `chromium/brand--default--1440--light.png` | `chromium/brand--default--1440--dark.png` | `chromium/brand--default--1180--light.png` | `chromium/brand--default--1180--dark.png` | `chromium/brand--default--768--light.png` | `chromium/brand--default--768--dark.png` | `chromium/brand--default--390--light.png` | `chromium/brand--default--390--dark.png` |
| Brand | empty (a brand-new account) | review | `review/brand--empty-account--1440--light.png` | `review/brand--empty-account--1440--dark.png` | `review/brand--empty-account--1180--light.png` | `review/brand--empty-account--1180--dark.png` | `review/brand--empty-account--768--light.png` | `review/brand--empty-account--768--dark.png` | `review/brand--empty-account--390--light.png` | `review/brand--empty-account--390--dark.png` |
| Realtor partners | empty | review | `review/partners--empty--1440--light.png` | `review/partners--empty--1440--dark.png` | `review/partners--empty--1180--light.png` | `review/partners--empty--1180--dark.png` | `review/partners--empty--768--light.png` | `review/partners--empty--768--dark.png` | `review/partners--empty--390--light.png` | `review/partners--empty--390--dark.png` |
| Homeowner reports | empty (a brand-new account) | review | `review/homeowners--empty-account--1440--light.png` | `review/homeowners--empty-account--1440--dark.png` | `review/homeowners--empty-account--1180--light.png` | `review/homeowners--empty-account--1180--dark.png` | `review/homeowners--empty-account--768--light.png` | `review/homeowners--empty-account--768--dark.png` | `review/homeowners--empty-account--390--light.png` | `review/homeowners--empty-account--390--dark.png` |
| Settings | default | review | `review/settings--default--1440--light.png` | `review/settings--default--1440--dark.png` | `review/settings--default--1180--light.png` | `review/settings--default--1180--dark.png` | `review/settings--default--768--light.png` | `review/settings--default--768--dark.png` | `review/settings--default--390--light.png` | `review/settings--default--390--dark.png` |
| Settings connections | default | synthetic | `chromium/settings-connections--default--1440--light.png` | `chromium/settings-connections--default--1440--dark.png` | `chromium/settings-connections--default--1180--light.png` | `chromium/settings-connections--default--1180--dark.png` | `chromium/settings-connections--default--768--light.png` | `chromium/settings-connections--default--768--dark.png` | `chromium/settings-connections--default--390--light.png` | `chromium/settings-connections--default--390--dark.png` |
| Settings connections | empty (a brand-new account) | review | `review/settings-connections--empty-account--1440--light.png` | `review/settings-connections--empty-account--1440--dark.png` | `review/settings-connections--empty-account--1180--light.png` | `review/settings-connections--empty-account--1180--dark.png` | `review/settings-connections--empty-account--768--light.png` | `review/settings-connections--empty-account--768--dark.png` | `review/settings-connections--empty-account--390--light.png` | `review/settings-connections--empty-account--390--dark.png` |

### Boundaries, the unverified-email notice, and the emails

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unverified email notice | unverified, with resend | synthetic | `chromium/design-surfaces--default--1440--light.png` | `chromium/design-surfaces--default--1440--dark.png` | `chromium/design-surfaces--default--1180--light.png` | `chromium/design-surfaces--default--1180--dark.png` | `chromium/design-surfaces--default--768--light.png` | `chromium/design-surfaces--default--768--dark.png` | `chromium/design-surfaces--default--390--light.png` | `chromium/design-surfaces--default--390--dark.png` |
| Route error boundary | failed to load | synthetic | `chromium/design-surfaces--default--1440--light.png` | `chromium/design-surfaces--default--1440--dark.png` | `chromium/design-surfaces--default--1180--light.png` | `chromium/design-surfaces--default--1180--dark.png` | `chromium/design-surfaces--default--768--light.png` | `chromium/design-surfaces--default--768--dark.png` | `chromium/design-surfaces--default--390--light.png` | `chromium/design-surfaces--default--390--dark.png` |
| Route loading boundary | loading | synthetic | `chromium/design-surfaces--default--1440--light.png` | `chromium/design-surfaces--default--1440--dark.png` | `chromium/design-surfaces--default--1180--light.png` | `chromium/design-surfaces--default--1180--dark.png` | `chromium/design-surfaces--default--768--light.png` | `chromium/design-surfaces--default--768--dark.png` | `chromium/design-surfaces--default--390--light.png` | `chromium/design-surfaces--default--390--dark.png` |
| Email preview | reset password, 600px | synthetic | `chromium/email-preview--default--1440--light.png` | `chromium/email-preview--default--1440--dark.png` | `chromium/email-preview--default--1180--light.png` | `chromium/email-preview--default--1180--dark.png` | `chromium/email-preview--default--768--light.png` | `chromium/email-preview--default--768--dark.png` | `chromium/email-preview--default--390--light.png` | `chromium/email-preview--default--390--dark.png` |
| Email preview | confirm email, 600px | synthetic | `chromium/email-preview--default--1440--light.png` | `chromium/email-preview--default--1440--dark.png` | `chromium/email-preview--default--1180--light.png` | `chromium/email-preview--default--1180--dark.png` | `chromium/email-preview--default--768--light.png` | `chromium/email-preview--default--768--dark.png` | `chromium/email-preview--default--390--light.png` | `chromium/email-preview--default--390--dark.png` |

The two email rows are scored on axes 1, 3, 4, and 10 only, per the rubric's section 4: an email
has no states, no motion, and no responsive frames of its own. The frame columns record the frame
the surrounding preview page was at.

The three rows above them, the route error boundary, the route loading boundary, and the
unverified-email notice, share one picture each frame and theme:
`design-surfaces--default--<frame>--<theme>.png`. They are three screens in the rubric and one page
in the product, because none of the three can be navigated to and each is scored on its own axes.
PRD-006d's reopened-row review, F-28, says why the page exists. Home under the unverified-email
notice, in the Home table, is the same page's fourth state, `?state=home-under-notice`.

### Removed by PRD-009

Every row below was signed in PRD-008d's table. Each now reads "Removed by PRD-009 on 2026-10-03"
and stays as history. The pictures of a removed screen were deleted with the capture that drew them,
by the lane that removed the screen (009F D4), and `tooling/tests/unit/design-quality/baselines-follow-the-screens.test.ts`
fails if one comes back or a spec names one.

| Screen | State | Server | Row reads | Why it left | Its own pictures deleted |
| --- | --- | --- | --- | --- | --- |
| Shell | rail | synthetic | Removed by PRD-009 on 2026-10-03 | The left rail (D-2, 009a); the top bar replaces it | none of its own; judged on other screens' pictures |
| Shell | collapsed rail | review | Removed by PRD-009 on 2026-10-03 | The left rail (D-2, 009a); the top bar replaces it | 6 (`shell--collapsed-rail`: 1440, 1180, 768, in both themes) |
| Shell | tablet rail | synthetic | Removed by PRD-009 on 2026-10-03 | The left rail (D-2, 009a); the top bar replaces it | none of its own; judged on other screens' pictures |
| Shell | mobile drawer | review | Removed by PRD-009 on 2026-10-03 | The rail's mobile drawer (D-2, 009a); the Menu sheet replaces it | 2 (`shell--mobile-drawer`: 390, in both themes) |
| Shell | not-connected banner | review | Removed by PRD-009 on 2026-10-03 | The shell-wide not-connected banner (D-11, 009a); connection facts are stated once, where they matter | none of its own; judged on other screens' pictures |
| Shell | "Finish setup" chip | review | Removed by PRD-009 on 2026-10-03 | The walkthrough's chip in the top bar (009b D4) | 8 (`shell--finish-setup-chip`) |
| Create | empty | synthetic | Removed by PRD-009 on 2026-10-03 | The open house create screen (009d); "Launch an ad" replaces it | 8 (`campaign-create--default`) |
| Create | prefilled | review | Removed by PRD-009 on 2026-10-03 | The open house create screen (009d); "Launch an ad" replaces it | none of its own; judged on the guided setup's step 4 pictures, counted there |
| Create | saving | synthetic | Removed by PRD-009 on 2026-10-03 | The open house create screen (009d); "Launch an ad" replaces it | 8 (`campaign-create--saving`) |
| Create | ready for approval | synthetic | Removed by PRD-009 on 2026-10-03 | The open house create screen (009d); "Launch an ad" replaces it | 8 (`campaign-create--ready-for-approval`) |
| Create | needs changes | synthetic | Removed by PRD-009 on 2026-10-03 | The open house create screen (009d); "Launch an ad" replaces it | 8 (`campaign-create--needs-changes`) |
| Reports | not connected | synthetic | Removed by PRD-009 on 2026-10-03 | The Reports page (OD-D, 009f D1) | 8 (`reports--default`) |
| Onboarding | default | synthetic | Removed by PRD-009 on 2026-10-03 | The /onboarding checklist (009f D1) | 8 (`onboarding--default`) |
| Guided setup step 1 | welcome | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 `guided-setup--*` pictures |
| Guided setup step 2 | your details | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 |
| Guided setup step 3 | your Realtor partner | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 |
| Guided setup step 4 | create the campaign, first field | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 (`guided-setup--step-4-create-the-campaign-first-field`) |
| Guided setup step 4 | create the campaign, last field | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 (`guided-setup--step-4-create-the-campaign-last-field`) |
| Guided setup step 5 | read the result, ready | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 |
| Guided setup step 5 | read the result, needs changes | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 |
| Guided setup step 6 | approve | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 |
| Guided setup step 6 | hand off | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 |
| Guided setup step 7 | what happens next | review | Removed by PRD-009 on 2026-10-03 | The guided-setup walkthrough (009b D4) | 8 of the 80 |

The pictures deleted add up to 144 of the 376 PRD-008d left: 48 under `chromium/` (8 reports, 8 onboarding, 32 create) and 96 under `review/` (80 guided setup, 8 "Finish setup" chip, 6 collapsed rail, 2 mobile drawer), the count 009F D4 and the inventory test hold.

## Where each row's picture comes from

The two screenshot suites capture one picture per row, frame, and theme, named
`<screen>--<state>--<frame>--<theme>.png` with the state as this table's state word in lower case
with hyphens, and a cell names it as `<folder>/<file>`. `tests/visual/screens/README.md` says where
each suite runs and how to take a set without touching a baseline. The table was built from the
installed files, not from a list of screens.

Installed: 74 under `chromium/` and 402 under `review/`, 476 in all, each named by at least one row.
The table names 476 distinct pictures in 508 cells (the three boundary rows and the two email rows
share pictures, and the synthetic Home is named by the top-bar row and by its own), and the check in
"How to fill this in" reads "476 named, 0 missing".

### Rows that share a picture, or name another row's

- **Shell, top bar.** The bar has no picture of its own. It is on every in-shell picture and was
  scored on all of them. The row names the synthetic Home's eight because they draw it with the
  "Local demo with sample data." line, the one place the bar differs.
- **Shell, Help sheet open** draws the Help sheet over Home.
- **Reset password, saved** draws Home, not the reset form: the person has just set a password, is
  signed in, and lands on Home under the "Your password is saved. You're signed in." notice.
- **Campaign detail and the campaign page** are one page with two sets of names. The
  `campaign-detail--*` pictures kept the names their earlier captures gave them. Ready, approved, and
  already decided draw the page of a campaign the seeded creator saved through "Launch an ad", as the
  seeded approver sees it before and after deciding (`tests/browser/review/review-campaign-decision.spec.ts`).
  Permission-restricted draws a campaign page as a creator, who cannot approve, sees it. The default
  picture is the unlinked demo campaign, `/marketing/campaigns/synthetic-open-house-001`. The
  `campaign-page--*` pictures are the new account's own saved campaigns.
- **The two emails** are one page, `email-preview--default--*`, with each message in its own
  600px frame, so both rows name the same eight pictures.
- **The boundaries and the notice** share `design-surfaces--default--*`, as the note under the table
  says.

### Rows whose server column is review

| Row | Why it is a review row |
| --- | --- |
| Every account screen | Every auth page answers 404 unless the deployment serves the signed-in product (`apps/web/src/features/auth/auth-page-gate.ts`, 006A-AC-026). The review composition is where a real session and a real sign-up exist. |
| Campaign detail: ready, approved, already decided | Synthetic mode's principal holds `campaign_creator` (`apps/web/src/server/authenticated-principal.ts:240`), and `campaignMayBeApprovedBy` (`packages/application/src/campaign-workspace-read.ts:153-162`) needs an approval role. A synthetic deployment can therefore never render an approvable or an approved campaign. The seeded approver can. Permission-restricted stays synthetic, because that is exactly what a creator sees. |
| Home first run, the Campaigns list for a brand-new account, the Ads library, launch steps 1 and 2, Brand, Realtor partners, Homeowner reports, Settings, and Connections for a brand-new account | They are pictures of a real sign-up's own pages, from one account that `tests/browser/review/empty-account.spec.ts` signs up once and reuses (009G D1), photographed before anything is saved. |
| Launch step 3, the campaign page states, the Campaigns list with every chip, and the gone page | The same account, after it has saved its brand and four campaigns through "Launch an ad" and had three more stored beside them (the next row) (009G-AC-002). |
| Ads library, Home, and step 1 on the real catalog | The review run starts a second server without the samples flag, so the real catalog, which ships empty, is what the page shows (`tests/browser/review/real-catalog/first-impression.spec.ts`). That is the hosted first impression. |
| Campaign page: ad retired, newer version, saved before PRD-009 | The product never saves a version against a retired, replaced, or missing ad (009D-AC-011), so no browser reaches these. They are stored through `seedCampaignHistory` with the product's own manifest builder, and the pages that show them read what is stored. |
| Help sheet open and Menu sheet open | Both are states of the signed-in shell that a person reaches with a control, and the review server is where a real session exists. |

### What the review run spends, per run

The review project shares one client address with the product's own rate limits, so how many
sign-ups it spends is part of its coverage. The product allows ten sign-ups an hour per client
address and counts every submission, refusals included. The header of
`tests/browser/review/empty-account.spec.ts` counts eight for the review run and names the spec that
spends each: two refusals in `design-quality.spec.ts`, and one account each in
`workspace-pages.spec.ts`, `home-first-run.spec.ts`, `launch-an-ad.click-count.spec.ts`,
`launch-an-ad.timed.spec.ts`, `empty-account.spec.ts`, and `real-catalog/first-impression.spec.ts`.
That leaves two, which is the room a retry has under CI, because a retried file that signs up in
`beforeAll` signs up again. The count is the same eight it was under PRD-008d (six accounts and two
refusals both times): the walkthrough's specs left, and the brand-new account's pages now share one
account instead of costing one sign-up each.

### Pictures carrying a painted-over region

Every date in every picture is painted over, in Playwright's own mask colour, on the date's own line
boxes (`markTheMasks` in `tests/browser/helpers/design-quality.ts`). A date is a fact about the clock
or about the catalogue's fixed review dates, never about the design, and a baseline that changed
with the clock would fail on another day. The colour is loud on purpose, so that nobody reads it as
a surface. Read a picture with a painted date as a picture whose date is absent.

### Frames a state does not have

Cells read "frame not drawn" in these rows, and nowhere else. Each has fewer than eight pictures
because the product does not have the state at the other frames.

| Row | Frames drawn | Why |
| --- | --- | --- |
| Shell, Menu sheet open | 390 Light and 390 Dark | The sheet exists only below 720px (009A-AC-011). Above it the bar shows every link, and at 768 it shows them on a second row. |
| Home, under the unverified-email notice | 1440 Light and 390 Light | 009G-AC-001 names the pair. The review run configures no email, so it can never show Home and the notice together, and the synthetic design surfaces page draws them instead (`?state=home-under-notice`). |

### Rows no automated suite could take

None was staged by hand for PRD-009, and the 2026-09-20 table that explained why each earlier row
once had to be staged by hand is in this file's git history; every row that table named is now taken
by a suite or was removed. Home with campaigns, the last state without a picture, is drawn by
`tests/browser/review/empty-account.spec.ts` since run 37163215460.

## Out of scope, recorded rather than fixed

PRD-006d 006D-AC-018 and the rubric's section 5, entries D-004 and D-005. Re-read on 2026-10-03
against the PRD-009 tree.

| Surface | Recorded drift | Why it is out of scope |
| --- | --- | --- |
| `/demo` | A private nine-token palette, 76 hex values, a `backdrop-filter`, and no Dark block in `apps/web/src/components/demo/founding-offer-demo.module.css`. | PRD-006d Non-Goals. The route is served only in synthetic mode and answers 404 everywhere else (`apps/web/src/app/demo/page.tsx`), and no screen in either mode links to it. The second fact is held by `tests/browser/design-quality.spec.ts` for synthetic mode and `tests/browser/review/design-quality.spec.ts` for review mode. |
| The synthetic reporting gallery | Demonstration rows and filters that existed only to show the reporting surface. | Removed by PRD-009 on 2026-10-03 with the Reports page (009F D1): `reporting-acceptance-surface.tsx` and `reports-screen.tsx` no longer exist. |
| `<select>` on the reporting screens | Two native selects, wrapped in `FormField`. | Removed with the same screens: a search of `apps/web/src` on 2026-10-03 finds no `<select>` element. PRD-006d D4 still defers a `Select` primitive; rubric section 5, entry D-004. |
| Checkbox and radio controls | Native controls inside an associated label on sign-in, the workspace choice, step 3 of "Launch an ad", and the Homeowner reports builder. | PRD-006d D4 ships no primitive for either. They are allowed by name in `tooling/tests/unit/design-quality/governed-controls.test.ts`, not hidden. Step 3 and the Homeowner reports builder replace the create screen as the places they appear. |

## How this was filled

### The PRD-009 re-sign of 2026-10-03 (009G-AC-007)

Re-signed by `ux-ui-guardian`, Gauntlet PRD-009 Wave 4, for the orchestrator, against the whole
PRD-009 tree: the light look and top menu (009a), Home (009b), the Ads library (009c), "Launch an
ad" (009d), the campaign page and list (009e), the removals (009f), and the verification specs
(009g). The table was built fresh from the installed files. Nothing in it is carried forward from
PRD-008d's cells. Of the 376 pictures PRD-008d left, 144 belonged to screens PRD-009 removed and were
deleted, 232 belong to screens it kept and were redrawn, and 244 are new (the first dispatch's 236,
and the eight of Home with campaigns that the fifth redraw added), which is the 476 installed.

**The five redraws.** Each is a dispatch of `screen-baselines.yml`.

- Run 37059676544 on `de69e09e`: the single dispatch 009G-AC-004 allows. It drew all 468 pictures
  (74 synthetic, 394 review), 232 changed and 236 new.
- Run 37136898883 on `0d539dee`, under 009G-AC-011: pass 1's fixes changed rendered output.
- Run 37149916536 on `8178126b`, under 009G-AC-011: round 2's design lanes (G, H, I, J), the
  quality close-out's lanes, the glyphs, and the writing fixes changed rendered output again.
- Run 37157590605 on `963630c9`, under 009G-AC-011: round 3's two fix lanes (X for "Launch an ad",
  the library, the campaign page and list; Y for Home, the workspace pages, Connections, Homeowner
  reports, and the demo page).
- Run 37163215460 on `ee03945a`, under 009G-AC-011: one micro-round fixed pass 4's follow-ups (the
  grey ring on step 3's links, the Approval card's first sentence, "Request a new link" on the
  expired reset link, single words left alone on a line, a relative time that wrapped) and added the
  capture of Home with campaigns. It drew 476 pictures; 201 differ from run 37157590605's, the eight
  of Home with campaigns among them. **Its pictures are the ones installed and named above.**

**The scored review passes and the stopping rule.** Four `ux-ui-guardian` reviewers on opus each
took a set of the 468 pictures and scored every one on the ten axes against the rubric, the PRD-009
design direction, and the PRD-009 mockups: R1 "Launch an ad" and the Ads library (104), R2 the
campaign page and list, the gone page, and the shell (138), R3 Home, Settings, Connections, Brand,
partners, and Homeowner reports (80), R4 the account screens, the email preview, and the design
surfaces (146). The report is
`library/requirements/completed/prd-009-marketing-toolkit/qa/2026-10-03-scored-baseline-review.md`.

- Pass 1, on run 37059676544: no picture at 3 on every axis. 58 findings (4 High, 17 Medium, 37 Low),
  each fixed with a test where a test can pin it.
- Pass 2, on run 37136898883: 194 of 468 at 3 on every axis. One Medium and about 25 Low remained.
- Pass 3, on run 37149916536: every earlier finding resolved, and 270 of 468 at 3 on every axis.
  One Medium and 22 Low remained, most of them visible in the earlier passes and missed there.
- The stopping rule, the orchestrator's: pass 3 is the last full scan. Its 23 findings were fixed in
  one round (lanes X and Y), the affected pictures were redrawn once more (run 37157590605), and pass
  4 confirms that each of the 23 is resolved on the final pictures. Anything new that pass 4 sees is
  recorded as a dated follow-up and does not reopen the review. Pass 4's result is in the report under
  its own heading, and it is part of what this sign-off rests on.

**Rulings that shape how the rows were read.** Chips are 12px everywhere (the component spec over the
mockups' 14px). Buttons keep the shared weight 500 (the brief over the mockups' 600). A large Card's
inset is 20px below 720px and 24px above. Where a written spec line and a PRD-009 mockup disagree,
the mockup wins and the spec line gets a dated note. The demo campaign page is exempt from axis 10
only (rubric section 5, R2 F-14). Each is in the report, with the finding that caused it.

**What this file does not repeat.** The findings, with their pictures, sources, and fixes, are in the
report. The machine checks PRD-009g adds for these screens are 009G-AC-001 and 009G-AC-002 (axe at
zero for each capture), 009G-AC-010 (the keyboard, the 2 px focus ring with its 3 px offset, and the
sticky bar), and 009G-AC-012 (reduced motion). This file does not restate their results.

**Signed.** Every row of the table names pictures that exist on disk, or names a frame the state does
not have and says why, and no cell reads "not photographed" or "asserted". One state has no picture
at any frame, Home with campaigns, and is recorded under "Frames a state does not have" rather than
signed on a picture. The scores that make a row signed are the report's: pass 3's for the 270 of 468
pictures it found at 3 on every axis, and pass 4's confirmation for the rest, whose pass 3 findings
round 3 fixed.

**The earlier sections stay as history.** Everything from "The second re-sign of 2026-10-01" down is
the record of PRD-008d and PRD-006d, kept as written. The findings, fixes, and numbers in it describe
those trees, and the rows it names (the rail, the guided setup, reports, onboarding, the open house
create screen) are the rows PRD-009 removed.

### The second re-sign of 2026-10-01 (D-009 and D-010, 008D-AC-011)

Re-signed by `ux-ui-guardian`, Gauntlet lane L6c, after `design-system-guardian` ruled D-009 and
D-010 "fix now" in the rubric's section 5. The fix (`2687100`) puts the body step on `body` and each
heading level's step on its element, deletes the bootstrap `section { max-width: 44rem }` with the
four declarations that only undid it, and draws every timestamp in the data font, as brief section
10 asks. The redraw was dispatched three times under 008D-AC-011, each for fixes the review of the
run before it caused: run 36838168997 on `c3ab3ec`, run 36841695906 on `83095a1`, and run
36844271868 on `eaf34e6`, **whose pictures are installed**. The scored review, with every picture
that changed, its cause, and its verdict, is the second half of
`library/requirements/completed/prd-008-finish-line-hardening/qa/2026-10-01-008d-baseline-review.md`,
"Second redraw: D-009 and D-010 (008D-AC-011)".

Against the baselines the first re-sign installed (`d7af15a`, unchanged at `814939f`), 343 of the
376 pictures changed (110 synthetic, 233 review), none is new, and none is removed. The 33 that
did not change are the email preview's eight, the boundary page's two at 390, reset password's
default and expired-link states (fifteen cells), and verify email's confirmed state (eight); each
keeps its pass from the first re-sign.

**What the machine asserted for every cell.** On the runner, run 36844271868: the synthetic suite
**141 passed, 0 failed** (26 dashboard-preview specs skipped by project) and the review project
**104 passed, 0 failed**, the latter on the run's second attempt after the first stopped in
`pnpm test:db` on an unrelated rate-limit test before any picture was drawn, with every check the
first re-sign lists. The fix added these, so they hold on every platform and not
only in a picture: wherever either suite takes a picture, `html` computes 16px, `body` the 13px body
step, every visible text and field value one of the six steps, and every visible date the data font
(`expectTypographyOnBrief`); every metric card keeps its state label and its value inside the card
at every frame in both themes; the overview fills its column as the campaigns list does; the
overview's action links keep their own height; the reports screen keeps each group of actions
together and its campaign cards at `--space-4`; a finding's note stands `--space-3` clear of what
follows it; the rail's titles are larger than its links and its product name balances its lines;
the change-password form keeps the account measure at the column's start. On `pnpm test:unit`,
`global-element-defaults.unit.test.ts` holds the stylesheet's element defaults and the guard
against an element-selector width, and `type-tokens-defined.unit.test.ts` fails any type token the
token layer does not define.

**Findings of the second redraw, and what happened to them.** Each is in the review report in the
rubric's finding form with its file and line, and each was fixed with a test before the pictures
were installed.

- R-14, fixed (`c3ab3ec`). The overview's "See your leads" was stretched to a button some 200px tall
  beside an unavailable action (axes 1 and 2).
- R-15, fixed (`c3ab3ec`). Reports pushed each pair of actions to opposite edges of its card once
  its sections took the column (axes 1 and 10).
- R-16, fixed (`c3ab3ec`). A reports campaign card's metric cards touched the lines above and below
  them (axis 2).
- R-17, fixed (`c3ab3ec`). The create screen's legends named a weight token only the dashboard
  preview defines and were drawn lighter than their own labels (axes 1 and 3).
- R-18, fixed (`c3ab3ec`). A finding's note touched the support details under it (axis 2).
- R-19, fixed (`83095a1`). The rail's two titles were drawn at the size of its links (axes 1
  and 10).
- R-20, fixed (`83095a1`). The change-password form shrank with its title to some 296px and floated
  mid-column (axes 2 and 10).
- R-21, fixed (`eaf34e6`). The runner's face left "LO" alone on the rail title's second line
  (axis 3).

**D-009 and D-010 are closed**, by the conditions the rubric's section 5 set: the fix and its redraw
are in, every gate passes, and every redrawn picture scores 3 on the axes each names (D-009 axes 1
and 3; D-010 axes 2, 7, and 10 at 1440 and 1180). They are no longer this sign-off's open debts.

### The re-sign of 2026-10-01 (PRD-008d)

Re-signed by `ux-ui-guardian` from the baselines the `ubuntu-24.04` runner drew for the PRD-008d
tree. The redraw was dispatched once for the Wave 1 change set and the capture fixes (run
36823126319), and twice more under 008D-AC-011 for fixes its review caused (runs 36825957221 and
36828316006). The scored review, with every changed or new picture, its cause, and its verdict, is
`library/requirements/completed/prd-008-finish-line-hardening/qa/2026-10-01-008d-baseline-review.md`.

Every picture was compared with the committed baseline pixel by pixel; every changed picture was
read on a labelled contact sheet, and every one whose change was more than rasterisation was read
at full size, cropped to the change. The causes were the dependency group (React 19.3, Next 16.3.6,
Playwright 1.63), PRD-008b's decision-aware copy, PRD-008c's copy (no homeowner screen is a row of
this table, so none of its pictures exists to change), the email preview's sandbox, the new states
S-1, S-2, S-3, and A-1, and the fixes below.

**What the machine asserted for every cell.** On the runner, run 36828316006: the synthetic suite
**137 passed, 0 failed** and the review project **104 passed, 0 failed**, each with axe, overflow, the
44 by 44 targets, the keyboard walk and ring, reduced motion, and the theme before paint, as the
first fill describes. PRD-008d added these, so they hold on every platform and not only in a
picture: the walkthrough's highlighted element is on screen, below the header, and clear of the
panel (step 1, every frame and theme); nothing in a panel shows below its footer (every captured
step); every notice title is the informational tone in both themes; every metric card keeps its
state label inside the card at every frame; the campaigns list opens at the top of the content and
at the column's edge, its empty state is the shared `empty` state, and a card title is smaller than
the page title.

**Findings of 2026-10-01, and what happened to them.** Each is in the review report in the rubric's
finding form with its file and line.

- R-1, fixed (`c2c51fe`). Step 5 at 1440: the result sat under the sticky header with only its
  ring's edge showing, and the panel beside it rose over the header's theme control and "Sign out"
  (axes 5 and 7). The beside-the-element case of `resolveAnchorScroll` now keeps the element
  between the header and the viewport's end, and the panel is placed against the same floor.
- R-2, fixed (`c2c51fe`). Step 5 at 768 and 1180: the panel covered the finding card the step was
  explaining (axis 7). The step points at the whole check result, the verdict and what the checks
  found, so both are scrolled above the panel.
- R-3, fixed (`c2c51fe`). Every guided-setup panel taller than its cap showed a band of its next
  progress row below Continue: the sticky footer stopped the sheet's end padding short of the
  panel's edge (axes 2 and 10). The padding is the footer's own now.
- R-4, fixed (`d788f35`). The new pictures of step 1 were taken from the top of the page with the
  walkthrough's own scroll undone, so at 1180, 768, and 390 the panel pointed at quick actions below
  the fold. The cell now photographs what the product shows after its scroll from the top of the
  overview.
- R-5, fixed (`d788f35`, `2cadc3e`). The populated row had no populated picture (above).
- R-6, fixed (`0392b64`). The "nothing goes out" notice title on create, campaign detail, reports,
  and brand took its colour from whichever of two equally specific rules the bundle loaded last,
  and the dependency group's Next.js swapped which, so it was blue on some screens and dark on
  others (axes 4 and 10). It is pinned to the informational tone the onboarding notice already
  pins.
- R-7, fixed (`0392b64`). The bootstrap `main` rule centred a short page in the frame, so the
  campaigns list, change password, and the boundary page floated about 200px below where every
  sibling page starts (axis 2).
- R-8, fixed (`0392b64`). The campaigns list's empty state was a card built on the page rather than
  the shared `empty` state (axis 9).
- R-9, fixed (`0392b64`). The campaigns list's card titles were drawn at the browser's own heading
  size, larger than the page title, with default margins (axes 1, 2, and 3).
- R-10, fixed (`0392b64`, `02ea08a`). A metric card's state label ran past the card's edge on
  the overview at 1440 and 1180 (axis 7).
- R-11, fixed (`2be0385`). Right after a decision the approval card lost its title, while the same
  campaign loaded later shows it (axes 1 and 10).
- R-12, fixed (`a414eae`). Pictures carried incidental hovers wherever the last click left the
  pointer, which differed between runs (the theme control at 1180 on most walkthrough pictures and
  on the help menu, a button on sign-up and reset password). The pointer is parked before a
  picture.
- R-13, fixed (`02ea08a`). The campaigns list's width followed its contents, so its title moved
  about 300px between the empty and the populated state (axes 2 and 10).

**Recorded, not fixed, with an owner.** Two deltas hold on rows other than the ones that changed,
were on the tree the first fill signed, and are system-level by the folder's own rule (they move
every screen), so they are handed to `design-system-guardian` with the evidence in the review
report rather than rebuilt from inside one lane. They are proposed for the rubric's section 5 as
D-009 and D-010, to be recorded there by their owner; until then they are this sign-off's open
debts, not passes by agreement.

- D-009 (proposed). Page paragraphs that no module sizes render at the browser's 16px default, not
  brief section 10's 13px body step (measured from the pictures by cap height: for example the
  campaigns list's lead sentence and its cards, campaign detail's cards, and the overview's lead).
  Axis 3, every in-shell row and the account screens.
- D-010 (proposed). The bootstrap `section { max-width: 44rem }` rule caps every section in the
  shell, so the overview's metric grids squeeze four cards into 704px at 1440 and 1180; the word
  value "Unavailable" in the synthetic overview's "More numbers" runs into its card's end padding.
  Axis 7, the overview row and every shell row whose picture is of the overview.

Both were ruled "fix now" by `design-system-guardian` the same day, and both are fixed and closed by
the second re-sign above.

### The first fill, 2026-09-21

Filled and signed by the orchestrator on 2026-09-21 from a capture of `74999a8` written outside git
(`OALO_SCREEN_SNAPSHOT_DIR`, `OALO_UPDATE_SCREEN_BASELINES=all`, both suites, 112 synthetic and
232 review pictures, capture `signoff-74999a8`), read as 43 labelled contact sheets (eight
pictures each, every picture on exactly one sheet) plus full-size reads of the pictures a sheet
put in question. Every named state in the table maps to the picture group named in the capture
by `<screen>--<state>--<frame>--<theme>.png`; a row whose picture group carries another row's
screen (the shell rows, the create page prefilled by the walkthrough, the three design surfaces,
the two emails) is judged on that picture.

**What the machine asserted for every cell before a person looked.** The browser suite on the
same tree (`scratchpad capture-74999a8.log, synthetic suite`, 139 cases) and the review project of the database gate
(`scratchpad capture-74999a8.log, review project`, 90 cases) run, per screen, frame and theme: axe with zero violations, no
horizontal overflow, every control at least 44 by 44 (axis 5 and 7), the keyboard walk with the
ring measured on the control (2 px, 3 px offset, `--focus-color` from the element's own cascade,
axis 5), reduced motion honoured (axis 6), the theme resolved before the picture (axis 8), and
the named error and empty states rendered through the primitives (axis 9). Axis 4 is pinned by
the token contrast test (82 pairs, every ring against every surface). The sheets were read for
what those assertions cannot see: hierarchy, spacing rhythm, typography, dark and light parity,
responsiveness of the composition, and consistency with the canvases (axes 1, 2, 3, 7, 8, 10).

**Findings, and what happened to them.**

- F-1, fixed. The navigation rail's state chip overlapped or squeezed the label whenever the chip
  was long: "Automation" ran under "Not included in your plan" and "Email and SMS" broke into
  three lines, at 1440, 1180 and 768 in both themes, on every screen with the rail (axis 2 and
  7). Cause: the row's third grid column never shrank. Fixed at `d717c86`
  (`apps/web/src/features/shell/components/app-shell.module.css`): the chip and the detail sit
  on their own rows under the label. The capture this table is filled from is of the fixed tree.
- F-2, fixed. The disclosure banner's trailing status ("Not connected yet") broke into three
  lines at 768 in both themes (axis 2). Fixed in the same commit: the sentence wraps, the status
  keeps its line.
- Not a finding: the solid magenta bar under "Who signed off" on the already-decided campaign
  page is Playwright's screenshot mask over the decision timestamp
  (`tests/browser/review/review-campaign-decision.spec.ts`, `mask:`), so the picture is stable
  between runs. The live page shows the timestamp.

- Recorded after signing, not a finding. The sixteen review pictures of steps 3 and 7 were
  redrawn on the runner (screen-baselines run 35631562012, installed at `b9a0f97`) after the
  capture's canonical start changed for a step that points at nothing on the page: the picture
  now starts from the top of the page instead of wherever the previous step and the browser's
  clamp against the changing room below the content left the scroll, which differed between
  runs. The panel, its content and its placement are what the signed sheets show; only the
  page behind it moved. The redrawn pictures were read at full size, not on a new contact sheet.

**Cells that are not a plain `pass`.**

Since 2026-10-01 there are no "asserted" and no "not photographed" cells. Until then:

- `pass, asserted (A-1)`: guided-setup steps 1 and 2 at 1180 and 390 were asserted by
  `tests/browser/review/guided-setup.accessibility.spec.ts` but not photographed. The cell
  procedure in `tests/browser/review/design-quality.spec.ts`, renamed on 2026-10-01 from "the
  guided setup meets the bar at 1440 and 768, in both themes" to "the guided setup's steps 1 and 2
  meet the bar at every frame, in both themes", now photographs all four frames.
- `not photographed (S-1, S-2, S-3)`: verify email's confirmed state, the campaigns list's empty
  state, and step 5's needs-changes answer. Each is photographed since 2026-10-01 (see "Where each
  row's picture comes from" and the by-hand table above).

- `n/a`: a shell part that does not render at that frame (the rail below 1180, the tablet rail
  outside 768, the drawer outside 390).

Signed: every cell of every row is photographed and passes on all ten axes on the tree named
above. D-009 and D-010 are fixed and closed, as "The second re-sign of 2026-10-01" describes, and no
open debt is carried.
