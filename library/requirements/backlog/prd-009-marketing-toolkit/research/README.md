# PRD-009 research

The inputs PRD-009 was written from. Each file is a copy of what the authoring session read on 2026-10-01; absolute paths on the authoring machine were rewritten to repository-relative or descriptive text, and nothing else in them changed.

| File | What it is | Used by |
|---|---|---|
| [`2026-10-01-owner-direction.md`](2026-10-01-owner-direction.md) | The product owner's binding decisions OD-A to OD-G and his answers on the design proposal (D-1, D-2, D-4, D-9, and "follow the designer" for the rest) | Every sub-PRD; quoted in the index under "Owner decisions" |
| [`2026-10-01-oalo-toolkit-recon.md`](2026-10-01-oalo-toolkit-recon.md) | Read-only recon of this repository: the removal footprint with file and line, the prior criteria to supersede, the campaign flow today, the Overview and walkthrough causes | 009a, 009b, 009d, 009f |
| [`2026-10-01-listing-studio-recon.md`](2026-10-01-listing-studio-recon.md) | Read-only recon of the owner's other product, Listing Studio (AutomatedRE): its link import, branding and co-marketing model, tokens, and reuse ratings | 009a (tokens), 009c (link import), 009d (review and confirm patterns) |

The approved design proposal these documents led to is in [`../design/`](../design/).

## Rules for this folder

- Listing Studio (`jzferrell26/listing-studio`) is a private repository. Documents here and in the PRD cite its paths, line numbers, and behaviour. They never reproduce its source code. A lane that ports code reads it from the owner's repository directly.
- Line numbers in the recon reports were read on 2026-10-01 at commit `d7b0f72` and can drift by a line or two. Every line a sub-PRD cites was re-read when the sub-PRD was written.
- These files are history. If a fact in them changes, the sub-PRD that relies on it records the change in its Amendments section; the copy here is not edited.
