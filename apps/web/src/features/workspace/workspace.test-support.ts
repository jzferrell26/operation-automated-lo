import { DEFAULT_AD_BRAND } from "./ad-brand.js";
import type { WorkspacePageData, WorkspaceView } from "./model.js";

/**
 * One page of workspace data for the tests that render a workspace screen or the catch-all that
 * serves it, so the two suites build the same loan officer rather than two that drift.
 */

export const TEST_BRAND = {
  name: "Casey Rivera",
  company: "Evergreen Example Lending",
  email: "casey@example.test",
  phone: "555-0100",
  nmls: "123456",
  companyNmls: "234567",
  tagline: "",
};

export function workspaceData(
  view: WorkspaceView,
  overrides: Partial<WorkspacePageData> = {},
): WorkspacePageData {
  return {
    view,
    identity: {
      name: "Casey Rivera",
      company: "Evergreen Example Lending",
      role: "Workspace owner",
    },
    canEdit: true,
    preferences: { brand: null, adBrand: null, partners: null, messages: {} },
    defaultBrand: TEST_BRAND,
    defaultAdBrand: DEFAULT_AD_BRAND,
    reportsEnabled: true,
    valuationConfigured: true,
    contactConfigured: false,
    deliveryEnabled: false,
    lookupsUsed: 0,
    lookupLimit: 50,
    ...overrides,
  };
}
