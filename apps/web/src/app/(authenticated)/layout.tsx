import type { ReactNode } from "react";

import { AppShell } from "../../features/shell/components/app-shell.js";
import { projectNavigationForSession } from "../../features/shell/model/navigation.js";
import { loadAuthenticatedWorkspace } from "../../server/authenticated-workspace-data.js";

export default function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const fixture = loadAuthenticatedWorkspace().ui;
  const navigation = projectNavigationForSession(fixture.navigation, fixture.session);

  return (
    <AppShell navigation={navigation} session={fixture.session}>
      {children}
    </AppShell>
  );
}
