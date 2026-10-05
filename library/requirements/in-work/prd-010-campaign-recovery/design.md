# Property preparation interface

Batch A extends the existing light interface, governed by the current amendments to the design brief sections 9, 10, 14, and 18, and the shared form-field, select, card, link, and safe-action specifications. It adds no visual theme, custom color, navigation section, animation library, or existing-screen baseline change.

The separate `/marketing/campaigns/property` page has one heading, saved-brand context, property details, a saved-partner choice, explicitly timed event fields, and permission attestations that start unchecked. Shared FormField, TextField, TextArea, Select, Button, and Card primitives own their existing accessible behavior. Native checkboxes remain inside FormField; their labels are full-sized click targets. The layout reuses the existing campaign form, with a single-column fallback and the shared focus tokens.

Saving is the only primary action. Missing brand, missing partners, or insufficient authority disables it and explains the next step. Server or network failure preserves values; an uncertain save retains its retry identifier. The response cannot supply an arbitrary navigation URL. The campaign's own address shows its frozen property, partner, brand, times, permissions, and version history.

The six package states distinguish saved inputs from materials not generated, paid promotion not prepared, approval not ready, lead routing not verified, and results not live. No approve, download, publish, or provider-connect success is invented. Changing the default Home journey is deferred until the generated-output path is proven, so this batch does not replace working library functionality with an unfinished flow.

Verification frames: 1440 and 390 pixels. Verify keyboard-accessible controls, clear validation, no horizontal overflow, no console errors, a successful saved-record reload, and automated accessibility checks. A local capture is not a Linux pixel-baseline comparison or owner visual sign-off.
