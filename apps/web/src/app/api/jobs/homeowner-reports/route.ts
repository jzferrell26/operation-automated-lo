import { handleHomeSchedule } from "../../../../server/homeowners/scheduler.js";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handleHomeSchedule(request);
}
export const POST = GET;
