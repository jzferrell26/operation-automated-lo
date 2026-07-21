import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";

import {
  DEFAULT_TENANT_ACCENT_KEY,
  ThemeRuntimeProvider,
  getTenantAccentCssVariables,
  getThemeBootstrapScript,
  resolveServerTenantAccentKey,
} from "../theme/index.js";

import "./globals.css";

export const metadata: Metadata = {
  title: "Operation Automated LO",
  description: "Phase 0 evidence harness and platform scaffold",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      </head>
      <body>
        <ThemeRuntimeProvider>{children}</ThemeRuntimeProvider>
      </body>
    </html>
  );
}
