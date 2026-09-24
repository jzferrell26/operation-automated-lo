import { handleWorkspacePreferences } from "../../../../server/workspace-preferences.js";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handleWorkspacePreferences(request);
}
export function POST(request: Request) {
  return handleWorkspacePreferences(request);
}
