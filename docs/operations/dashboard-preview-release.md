# Dashboard visual testing release

## Entry point

The visual testing deployment uses the existing `operation-automated-lo-web` project in Vercel's `jonathan-ferrell` team. Its stable address is `https://operation-automated-lo-web.vercel.app`. The homepage opens `/overview`; `/onboarding` provides Getting started. This is a public sample-data demo, not a signed-in customer workspace. The compact **Demo workspace** control explains its data and publishing limits.

## What can be tested

- Overview, marketing suite, campaign list and detail, reports, partners, leads and pipeline, property sites, sample creative, brand, account, routing, connections, and settings.
- Create a campaign, use **Use example property**, then **Save & review campaign** to run the real in-memory content checks. Inspect findings and record a clearly labeled demo approval after successful checks. The campaign preview updates while entering details.
- Add a fictional partner, change a sample lead's stage, edit the preview profile, save routing preferences, reload, and observe the saved changes. Reset requires confirmation in Settings.
- Open the included Cedar Street property page and download its sample SVG creative. New property-site and print generation are not represented as working live services.
- Automations, marketplace, messaging, team invitations, and billing have intentional availability screens; their live services are not enabled.
- Open workspace search with the search control or Ctrl/Cmd+K. Switch campaign list/card views, edit a partner profile, and download a demo pipeline CSV from Reports. Settings opens directly to the company editor and a brand preview that updates while typing.

## Deployment configuration

The existing project requires the following non-secret environment settings for both its Production alias and Preview deployments:

| Name | Value |
| --- | --- |
| `OALO_DASHBOARD_PREVIEW` | `enabled` |
| `OALO_ENVIRONMENT` | `preview` |
| `OALO_PROVIDER_MODE` | `stub` |
| `OALO_SYNTHETIC_DATA_ONLY` | `true` |
| `OALO_PRODUCTION_TRAFFIC` | `disabled` |

`Production` above is Vercel's alias target, not application authority. The application deliberately stays in its synthetic preview environment. The explicit preview flag does not permit rendering in a real production/staging application environment or an authorized review runtime. Do not configure unrelated company databases or real provider credentials for this preview.

The authenticated review implementation remains present and continues to require its own identity, database, and runtime configuration. Turning off this flag restores the original screen routing. Full-system readiness and real provider qualification are separate from this release; `/api/health/ready` is not evidence that this preview is a functioning production service.

`apps/web/vercel.json` builds the web application and its workspace dependencies from source. Deployments exclude local `dist`, Next cache, and browser traces, so a developer's prebuilt files cannot conceal a missing dependency build.

## Data and request boundary

All test records are stored in the visitor's browser under the versioned `oalo.dashboard-preview.v1` key. Different browsers and devices have independent records. No campaign created here is a production approval, and nothing can be published or sent through the preview controls. Use fictional information only. Browser storage is not a shared account, an authorization boundary, or durable production storage.

The preview content-check endpoint compiles and checks in memory, bounds incoming data, refuses requests from a different browser origin, and returns no publication authority. It accepts the HTTP destination Host because Next can expose an internal localhost request URL after proxying. It does not trust an arbitrary forwarded host to choose the browser origin. Stored data is validated before being read or saved; a storage failure never produces a saved confirmation.

Unknown routes render the not-found UI with noindex. Next's streamed response may already have HTTP 200 headers, so browser checks assert the actual not-found boundary. The root artifact ignore is `/reports`, anchored so deployment includes the application's reports page.

## Repeatable verification

With Node 24.18.0 and pnpm 11.15.1:

```sh
pnpm --filter @oalo/web... build
pnpm test:browser:dashboard
```

The dedicated browser configuration starts the compiled app locally with the explicit preview flag. To test an existing deployment, set `OALO_PREVIEW_BASE_URL` to its HTTPS origin and run `pnpm test:browser:dashboard`; it will not start a local server. The suite covers 23 dashboard destinations and sample assets, creation/checks/test approval, blocked approval, reload persistence, separate-browser isolation, quota failure, reset behavior, four viewport widths, mobile navigation, and light/dark accessibility.

Local visual captures and any failure traces are saved beneath `test-results/dashboard-preview-local`. Hosted verification uses `test-results/dashboard-preview-live`. These files are intentionally not committed. The product demo now uses `ProductShell` with separate scoped tokens from `@oalo/ui/product-tokens.css`; the existing authenticated review layouts and screenshot baselines are unaffected.

## Recovery

To restore the previous UI, disable `OALO_DASHBOARD_PREVIEW` and redeploy the previous source commit, or restore the prior Vercel deployment. This does not delete a visitor's browser test data. **Settings > Demo workspace options > Reset demo data** removes only the demo's own key and restores the included sample workspace after confirmation.
