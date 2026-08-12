# PRD 001d: Page, PDF, QR, and Creative Rendering

## Goal

Generate co-branded Open House Boost collateral and a separate loan-officer or lender-branded paid-ad projection from one frozen campaign version, then publish only safe approved outputs.

## Scope

- Responsive single-property campaign page
- Print-ready PDF flyer or packet
- QR code and trackable link
- Meta feed and story creative
- Deterministic server-side rendering
- Object storage, CDN, versioning, and revocation
- Visual regression fixtures

## Acceptance criteria

### Determinism and lineage

- Rendering accepts a validated immutable manifest, never raw browser form state.
- Every artifact records campaign version, source profile versions, blueprint version, template version, renderer version, content hash, MIME type, dimensions, object key, and creation time.
- Re-rendering an unchanged manifest and renderer version produces the same logical output and stable content hash.
- A changed manifest creates new objects and does not overwrite approved artifacts.

### Public page

- The page is server-rendered and responsive.
- It includes approved property facts, gallery, open-house details, loan officer and Realtor identity, required disclosures, and calls to action.
- Open Graph and social metadata use approved content.
- A published-projection allowlist prevents borrower, contact, opportunity, notes, token, provider error, and unpublished draft data from appearing.
- Free text and URLs are validated, sanitized, and output-encoded.
- A strict content security policy is applied.
- The page can be unpublished without deleting the audit record.

### Lead experience

- The call to action opens the approved form or application-owned lead form.
- The rendered consent disclosure version is visible before submission.
- QR code and short link resolve to the same approved campaign version.
- Tracking parameters use opaque IDs and contain no personal data.

### PDF

- PDF generation runs in a server-side worker.
- Output is print-ready, accessible to the practical extent supported by the renderer, and includes required disclosures.
- Long addresses, names, descriptions, and disclosure blocks cannot overflow or disappear.
- The PDF contains no remote runtime dependencies after generation.

### Creative

- Generate only the initial approved Meta sizes.
- Meta creative uses loan-officer or lender identity only. It must not contain a Realtor name, image, logo, brokerage mark, contact information, or dual-brand treatment.
- Collateral and paid-ad creative use separate render projections, templates, hashes, and approval previews.
- Images are cover-cropped with configurable focal point and safe text zones.
- Copy and disclosure remain readable at output resolution.
- Each creative has a preview and downloadable original.

### Upload and storage

- Uploaded images are decoded and re-encoded before use.
- MIME, file size, pixel dimensions, and count limits are enforced.
- EXIF and unnecessary metadata are removed.
- Objects are private by default.
- Public artifact URLs use versioned immutable keys and only approved artifacts can be public.
- Signed preview URLs expire.

### Quality

- Golden fixtures cover common, long-text, missing-photo, portrait-photo, and multi-disclosure cases.
- Visual regression tests cover supported page widths and PDF pages.
- Accessibility checks cover headings, labels, keyboard use, contrast, alt text, and focus.
- Performance budget is defined for public-page server response and largest contentful asset.

## Out of scope

- General website builder
- Free-form design editor
- Video generation
- Automated MLS or portal image import
- Tenant custom domains in the first vertical slice unless required by the founding cohort

## Verification

- Security tests cover stored script injection, unsafe URLs, malicious uploads, broken object authorization, and renderer network access.
- The final golden Open House Boost package matches the approved Whetstone and Florida Fast Offer quality bar without retaining their customer-specific branding.
