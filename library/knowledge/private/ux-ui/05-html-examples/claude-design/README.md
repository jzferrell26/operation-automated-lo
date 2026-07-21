# Claude Design Source Package

This directory preserves the approved July 20, 2026 Claude Design package as visual design evidence.

## Source integrity

- Original archive: `Cuantico Overview dashboard directions2.zip`
- SHA-256: `E9D7DB67971477D5817A7C75E46103A7D665BB3628044D61BB0227B01BB2A43D`
- Imported: July 20, 2026
- Import method: archive extraction followed by the security sanitization described below, plus generated PNG previews and a `.webp` copy of the archive thumbnail

## Canvas map

| Canvas | Design responsibility |
|---|---|
| `Overview.dc.html` | Root platform overview |
| `Overview Responsive.dc.html` | 1180px embedded and 390px mobile references |
| `Dashboard.dc.html` | Marketing Suite campaign performance |
| `Campaigns.dc.html` | Campaign library |
| `Create.dc.html` | Open House Boost creation |
| `Studio.dc.html` | Campaign artifact studio |
| `Preflight.dc.html` | Deterministic preflight and approval |
| `Launch.dc.html` | Meta launch confirmation and progress |
| `CampaignDetail.dc.html` | Campaign outcomes, routing, versions, and activity |
| `Onboarding.dc.html` | Self-onboarding and Launch Ready |
| `Brand.dc.html` | Brand and compliance profile |
| `Welcome.dc.html` | Installed welcome and entry surface |
| `Design System.dc.html` | Semantic tokens and component examples |
| `AutomatedLO Directions.dc.html` | Earlier direction exploration retained for provenance |

## Security sanitization

The original package included `support.js`, which dynamically loaded React and Babel from a public CDN and evaluated canvas code. The repository copy does not include that runtime. Its script reference, external Google Fonts request, and inline event-handler attributes were removed from every HTML file. The three uploaded third-party reference screenshots were also excluded because they are not required to define the approved product design.

The remaining HTML is an inert static reference. Inline design logic was changed from `text/x-dc` to `text/plain` so it remains non-executable even if a canvas runtime is introduced elsewhere. Use the PNG previews for the fastest review path.

## Previews

- `previews/platform-overview.png`
- `previews/platform-overview-responsive.png`
- `previews/design-system.png`
- `previews/campaign-performance.png`

## Implementation warning

These files are design references, not production source. They include inline styles, raw color values, fixture data, and static interaction descriptions. Production implementation must follow the parent folder's brief, semantic tokens, component wrappers, PRDs, security requirements, and provider contracts.

If a canvas conflicts with a PRD or verified platform behavior, the PRD and verified contract win.
