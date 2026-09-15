import type { ReactNode } from "react";

import { AppShell } from "../../features/shell/components/app-shell.js";
import { projectNavigationForSession } from "../../features/shell/model/navigation.js";
import { loadAuthenticatedWorkspace } from "../../server/authenticated-workspace-data.js";

export const dynamic = "force-dynamic";

export default function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const workspace = loadAuthenticatedWorkspace();
  const fixture = workspace.ui;
  const navigation = projectNavigationForSession(fixture.navigation, fixture.session);

  return (
    <AppShell navigation={navigation} session={fixture.session} workspaceMode={workspace.mode}>
      {children}
    </AppShell>
  );
}
