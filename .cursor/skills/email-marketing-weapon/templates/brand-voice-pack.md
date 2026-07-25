# Brand-voice pack: <CLIENT NAME>

One pack per client. Loaded explicitly at the start of a job; voice never leaks between clients. See `../guides/07-brand-voice-packs.md`. The pack is ready to use only when the `compliance` block is complete (no send clears the preflight without it).

- **client**: <name>
- **one_liner**: <who they are, who they serve, in one sentence>
- **voice**: <3-6 adjectives> + <one-paragraph tone description>
- **signature_devices**:
  - <named device>: <short example>
- **do**:
  - <on-brand phrase / framing / move>
- **dont**:
  - No em dashes (project hard rule).
  - <off-brand phrase / move>
- **offers**:
  - <offer name>: <the transformation it promises>
- **assets**:
  - <book / signature talk / lead magnet, and how it is referenced>
- **design_system**:
  - palette: <colors / hex>
  - type: <typeface pairing>
- **proven_sequences**:
  - <any validated cadence, used as a starting structure>
- **compliance**:
  - from_identity: <From name + address>
  - reply_to: <address>
  - physical_address: <mailing address for the footer>
  - sending_domain: <subdomain>
  - bimi_path: <VMC if registered trademark / CMC if 12-month logo use / none>

> Mark any unknown client fact as: `> TODO: open question - needs human decision`. Do not invent client facts.
