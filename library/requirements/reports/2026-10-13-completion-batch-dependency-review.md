# Completion batch dependency review

Date: October 13, 2026. Reviewer: dependency-audit-guardian.

## Scope and tools

Scoped remediation of the blocking Next.js advisory in the completion batch. Node 24.18.0 and pnpm 11.15.1. Owned files: `apps/web/package.json`, `pnpm-lock.yaml`, and this report. No update to the separate Dependabot PR or audit policy.

## Triage

| Finding                                                                                  | Exposure and severity                                                                                                                                                                                                                                                                                                                                                                                                                    | Resolution                                                                                                  | Ignore policy               |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------- |
| [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4), CVE-2026-94483 | Direct production dependency `next@16.3.6`. High, CVSS v4 8.3. The advisory affects versions >=16.0.0 and <16.3.8. Exploitation requires an attacker-controlled allow-listed remote image URL. The current `apps/web/next.config.ts` does not configure `images.remotePatterns`, so the advisory's documented exploit condition is absent locally. This does not establish the production deployment's configuration or package version. | Pin the smallest published patched release, `next@16.3.8`, confirmed against the advisory and npm registry. | No new ignore or exception. |

## Manifest and lockfile

The manifest has one changed version. The lockfile has 41 added and 41 removed lines, limited to the web importer, Next.js, `@next/env`, and eight platform-specific `@next/swc` packages moving from 16.3.6 to 16.3.8. Other dependency versions, peer resolutions, overrides, and the existing braces advisory acceptance are unchanged.

Installation used `pnpm --filter @oalo/web add next@16.3.8 --save-exact --ignore-scripts` and completed successfully. `pnpm --filter @oalo/web list next --depth 0` confirms the installed direct dependency is 16.3.8.

## Verification evidence

| Check                                                                                | Result                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm audit:dependencies`                                                            | Exit 0. No actionable high or critical finding. Scanner reports one high finding ignored by the repository's pre-existing braces acceptance.                                                                                                                                         |
| `pnpm audit --prod --audit-level=high`                                               | Exit 0. No known vulnerabilities found.                                                                                                                                                                                                                                              |
| `pnpm install --frozen-lockfile --ignore-scripts --dry-run --verify-store-integrity` | Exit 0. Lockfile passes pnpm supply-chain policies; lockfile is up to date; real install would make no changes.                                                                                                                                                                      |
| Targeted npm registry verification for all ten changed package releases              | Each lockfile SHA-512 integrity matches registry metadata. Each release has an ECDSA signature verified using the registry's published SPKI key and the signed `name@version:integrity` payload. No preinstall, install, or postinstall hook is declared in these release manifests. |
| `git diff --check -- apps/web/package.json pnpm-lock.yaml`                           | Exit 0.                                                                                                                                                                                                                                                                              |

Registry metadata advertises SLSA provenance for all ten changed releases. This review verified registry signatures, not the provenance attestation bundles. It is not a behavioral malware scan. No scanner configuration was added.

## Remaining closeout

The parent owns the final build, types, tests, security review, and quality review after the dependency patch. Production deployment has not been performed by this remediation. No unresolved dependency decision or new advisory suppression is introduced by this patch.
