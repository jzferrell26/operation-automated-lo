# Select controls and guided product setup

Requested by Jonathan on September 22, 2026, after the dashboard redesign. Governing brief: sections 10, 14, 18 and the product dashboard screen specification.

## Section hierarchy

Campaign cards put a numbered heading and a short purpose statement inside the card, above the fields. The semantic fieldset legend remains available to assistive technology. It does not interrupt the card border. Card headings, fields, sticky preview, and focused controls must clear the measured shell header. Long text and narrow viewports cannot expand the page horizontally. The preview becomes ordinary document content in short or narrow windows.

## Shared Select

Feature screens consume `Select` from `@oalo/ui`. The control uses the existing FormField label, description, and error wiring. A single value is committed on click, Enter, Space, or Tab; Escape cancels an uncommitted choice. Arrow keys, Home/End, PageUp/PageDown, and type-ahead navigate enabled options without saving them. DOM focus stays on the combobox trigger. The popup is portaled into the nearest dialog or product shell to preserve theme and modal ownership, fits the viewport, flips upward near the bottom, and scrolls the active option into view. A disabled control cannot open. Hidden form values preserve regular FormData submission.

Reference patterns checked September 22, 2026: W3C APG Select-Only Combobox and React createPortal documentation. These guide interaction; implementation is qualified through actual browser keyboard, pointer, accessibility, and clipping tests.

## Self onboarding and help

The public demo offers an in-flow first-use welcome, a complete `/onboarding` setup journey, and persistent Help & setup. People may explore first, pause, resume, or replay a page guide. Setup saves company/profile details, brand voice, an explicitly selected or added Realtor partner, and routing preferences through the existing versioned demo store. It explains live connection requirements without claiming they are connected. The campaign step completes only after a saved campaign passes checks. Final review requires a recorded demo approval. Finishing the demo journey never implies live launch readiness.

Existing browser data is preserved through additive defaulted fields. Failed storage does not advance a step or claim a save. Restarts reset guide position, not business records. Walkthroughs navigate or focus controls only; they never click Save, submit a campaign, approve, publish, invite, bill, or fill consent checkboxes. Their highlight uses the existing guided-setup focus treatment and placement arithmetic. On narrow screens the helper can collapse; space is reserved so it does not cover the target. Missing targets display a useful message and remain skippable. The existing authenticated, server-persisted onboarding remains unchanged and separate from the explicitly enabled demo.

## Required evidence

Browser verification covers fresh welcome; profile, partner, and routing saves; checks and explicit approval; pause/reload/resume; replay without data loss; blocked and failed saves; dropdown keyboard, pointer, long-list, and dialog behavior; light/dark themes; 390/768/1180/1440 widths; and scroll positions with the helper and campaign preview visible. Capture the actual deployed screens after release.
