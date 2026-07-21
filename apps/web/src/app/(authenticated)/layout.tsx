import type { ReactNode } from "react";

import { loadSyntheticUiFixture } from "../../features/ui-foundation/data/load-synthetic-ui.js";
import { AppShell } from "../../features/shell/components/app-shell.js";
import { projectNavigationForSession } from "../../features/shell/model/navigation.js";

export default function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const fixture = loadSyntheticUiFixture();
  const navigation = projectNavigationForSession(fixture.navigation, fixture.session);

  return (
    <AppShell navigation={navigation} session={fixture.session}>
      {children}
    </AppShell>
  );
}
