# The ads library catalog

This folder is the real, platform-wide ads library (PRD-009c). `catalog.json` is the list of ads every loan officer chooses from. It ships empty: the repository owner supplies the real ads, and nothing in the product adds, edits, or retires one. Adding an ad is a reviewed change to this folder.

The sample ads that the local demo and the tests show live elsewhere, in `apps/web/src/fixtures/ads-library/`, and never in this folder.

## What an entry is

One entry is one version of one ad. The format is the schema in `packages/contracts/src/ads-library.ts` (PRD-009c D1); `catalog.template.json` is a filled-in example to copy. In short:

| Field                                                            | Rule                                                                                                                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                             | Lower-case kebab case, at most 60 characters, never reused, never starting `sample-`                                                         |
| `version`                                                        | 1, 2, 3, and so on, with no gaps for one `id`                                                                                                |
| `status`                                                         | `active` or `retired` on the highest version, `replaced` on every lower one                                                                  |
| `sample`                                                         | Always `false` here                                                                                                                          |
| `topic`                                                          | `first-time-buyers`, `refinance`, `va-loans`, `pre-approval`, or `down-payment-help`                                                         |
| `name`                                                           | 3 to 60 characters: the card title and the campaign's name                                                                                   |
| `images.tall.art`, `images.square.art`                           | Exactly `<id>/v<version>/tall.png` and `<id>/v<version>/square.png` (or `.jpg`)                                                              |
| `images.tall.sha256`, `images.square.sha256`                     | The SHA-256 of each file's bytes                                                                                                             |
| `images.alt`                                                     | 10 to 200 characters that say what the picture shows and what words are in it                                                               |
| `defaults.headline`, `defaults.primaryText`                      | The words a loan officer starts from, within `editable`'s limits, with no number, rate, payment, loan term, or Realtor or brokerage name      |
| `editable`                                                       | `headline.maxLength` at most 60, `primaryText.maxLength` at most 300                                                                         |
| `callToAction`                                                   | One of `APPLY_NOW`, `DOWNLOAD`, `GET_QUOTE`, `LEARN_MORE`, `SIGN_UP`, `SUBSCRIBE` (Meta's lead-form list); `LEARN_MORE` by default; never `CONTACT_US` |
| `specialAdCategory`                                              | `HOUSING`                                                                                                                                    |
| `compliance.notes`                                               | The rules for this ad in general terms. No lender name and no lender policy text: this repository is public                                 |
| `compliance.requiredOnAd`                                        | `["nmls", "equal-housing"]`                                                                                                                  |
| `approval.approvedBy`, `approval.approvedOn`                     | `jzferrell26` (the owner's handle, never a real name) and the date he approved this version                                                  |
| `retired.on`, `retired.reason`, `retired.replacedBy`             | Only on a retired ad. `replacedBy` is another `id` in this catalog, or `null`                                                                |

## The art

- The tall art is a PNG or JPEG of exactly 1080 by 1080 pixels: the top of the 4:5 ad. The product adds the brand band below it.
- The square art is exactly 1080 by 842 pixels: the top of the 1:1 ad.
- Each file is at most 1 MiB. SVG is refused, and the type is read from the file's bytes, not its name.
- No EXIF, XMP, IPTC, or PNG text metadata. Strip it before committing, for example with the `sharp` the repository already uses: `sharp(input).png().toFile(output)` keeps no metadata unless asked to.
- The files go under `apps/web/public/ads-library/<id>/v<version>/`. Nothing else goes in that folder: every file in it is served to every visitor.

## Adding an ad

1. The owner hands the ad to an agent in a session or a private channel, never through a public issue. The repository is public, so text from an issue could come from anyone, and no text from an outside account ever supplies an `approval` block.
2. The agent adds the two art files and an entry copied from `catalog.template.json`, then appends its lock line:

   ```sh
   node tooling/scripts/ads-library/catalog-lock.mjs --catalog apps/web/src/features/ads-library/catalog/catalog.json --lock apps/web/src/features/ads-library/catalog/catalog.lock.json
   ```

3. `pnpm test:unit` runs the schema test over every entry and file and the lock check.
4. Each new ad, and each meaningful revision, needs lender review before the owner merges it (`library/knowledge/private/compliance/compliance-and-risk.md:74`).
5. The owner merges the pull request. **The owner's own merge is the approval record.** The repository ruleset requires 0 approving reviews and `.github/CODEOWNERS` is advisory, so nobody else's review is the gate: the merge is, and the tests are the automated half of it.

## Changing an ad: a new version

An existing `(id, version)` is never edited. `catalog.lock.json` holds every merged version's digests, default words, and limits, and the test fails if one of them changes or disappears. To change the words, the art, or the limits, add version N+1 with new art paths, set the older version's `status` to `replaced`, and append a lock line. A campaign that already uses the older version keeps it; an undecided one is offered the new version.

## Retiring an ad

Set the highest version's `status` to `retired` and add `retired`: the date, a plain reason, and the `id` that replaces it or `null`. Keep the entry and its art: campaigns that used the ad still show it. A retired ad leaves the library and can no longer be approved or launched.
