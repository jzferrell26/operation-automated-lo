# 02 - Auth and token resolution

How to authenticate each provider, and the single most common auth failure (the GHL agency-vs-sub-account trap).

## GHL / LeadConnector

Base URL: `https://services.leadconnectorhq.com` (verified live; the marketplace docs do not print it, per `research/ghl-social-planner/2026-06-29-ghl-social-posting-api-overview-auth.md`).

Headers on every call:

```
Authorization: Bearer <SUB-ACCOUNT PIT>
Version: 2021-07-28
Accept: application/json
Content-Type: application/json   (on writes)
```

### The sub-account-vs-agency rule (directive 4)

Location/sub-account endpoints require a SUB-ACCOUNT (location) token: an "Access Token with user type Sub-Account OR Private Integration Token of Sub-Account." An agency PIT on a location endpoint returns:

```
401 {"message":"Token's user type mismatch!"}
```

This is publicly confirmed in the official API overview (`research/ghl-social-planner/2026-06-29-ghl-social-posting-api-overview-auth.md`). If you see `Token's user type mismatch!`, you are using the wrong token type, not the wrong scope.

### Required scopes

`socialplanner/account.readonly` + `socialplanner/post.write`. Both are real, published scopes (`research/ghl-social-planner/2026-06-29-ghl-social-planner-public-api-changelog.md`, which lists all six: account/post/oauth x readonly/write). A `medias` scope is NOT necessarily required for the create-post path; media attaches by public URL, not by upload through a media endpoint.

> TODO: open question - needs human decision before next refresh. A PIT that has `socialplanner` scopes but lacks a `medias` scope is an operator decision to widen if media-library uploads are later needed. Source: Command Brief IDEAS section; `research/research-summary.md`.

### The Version header (pin the verified value)

Pin `Version: 2021-07-28` (verified live). The marketplace create-post page renders `Version: v3`, but the API overview lists `2021-07-28` among the valid versions, so the verified value is documented and correct (`research/ghl-social-planner/2026-06-29-ghl-create-post-api.md`, `research/ghl-social-planner/2026-06-29-ghl-social-posting-api-overview-auth.md`). The docs note that "version-specific differences exist," so a version change could alter the payload contract. Do not adopt `v3` blindly.

> TODO: open question - needs human decision before next refresh. Confirm which `Version` the production integration pins (`2021-07-28` verified vs `v3` in marketplace docs) and whether `v3` alters the payload contract. Source: `research/research-summary.md` open question 4.

## Zernio

Base URL: `https://zernio.com/api/v1` (`research/zernio/2026-06-29-zernio-social-media-api.md`).

Auth: a simple API key as a Bearer token. "Simple API Key Auth. Bearer token auth. No OAuth complexity." The OAuth flows are Zernio-side, for connecting the end-user's social accounts; the developer calls the API with the API key.

```
Authorization: Bearer <ZERNIO_API_KEY>
Content-Type: application/json
```

Zernio MCP server: `https://mcp.zernio.com/mcp`, authenticated by OAuth sign-in (recommended for Claude Desktop) or the same API key via `Authorization: Bearer` (`research/zernio/2026-06-29-zernio-mcp-server-default-scheduled-footgun.md`). See `guides/08-zernio-runbook.md`.

## Token hygiene (directive 3)

- Read tokens from env only (e.g. `GHL_SUBACCOUNT_PIT`, `ZERNIO_API_KEY`). Never inline them.
- Never log the token and never pass it as a command-line argument (it lands in shell history and `ps` output).
- Gitignore the env file. A committed or leaked token is a security incident.

## See also

- `guides/00-principles.md` (directives 3, 4)
- `guides/09-footgun-catalog.md` (the `401 Token's user type mismatch!` entry)
- `templates/env.example` (the env var names)
