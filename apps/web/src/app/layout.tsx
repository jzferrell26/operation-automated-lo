import type { Metadata } from "next";
import { headers } from "next/headers.js";
import type { CSSProperties, ReactNode } from "react";

import { DEFAULT_PAGE_TITLE, PAGE_TITLE_TEMPLATE, SITE_DESCRIPTION } from "../copy/page-titles.js";
import { CSP_NONCE_HEADER } from "../security/content-security-policy.js";
import {
  DEFAULT_TENANT_ACCENT_KEY,
  ThemeRuntimeProvider,
  getTenantAccentCssVariables,
  getThemeBootstrapScript,
  resolveServerTenantAccentKey,
} from "../theme/index.js";

import "./globals.css";

/**
 * Writing review W-13. A page names itself and the product follows ("Campaigns | Automated LO").
 * The default is the product's own name, which is the wordmark and not "Operation Automated LO".
 */
export const metadata: Metadata = {
  title: { default: DEFAULT_PAGE_TITLE, template: PAGE_TITLE_TEMPLATE },
  description: SITE_DESCRIPTION,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? undefined;
  const tenantAccent = resolveServerTenantAccentKey(DEFAULT_TENANT_ACCENT_KEY);
  const tenantAccentVariables = getTenantAccentCssVariables(tenantAccent) as CSSProperties;

  return (
    <html
      lang="en"
      data-tenant-accent={tenantAccent}
      style={tenantAccentVariables}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      </head>
      <body>
        <ThemeRuntimeProvider>{children}</ThemeRuntimeProvider>
      </body>
    </html>
  );
}
