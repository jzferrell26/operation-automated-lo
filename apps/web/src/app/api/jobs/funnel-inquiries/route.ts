import { runFunnelRetention } from "../../../../server/funnel-retention.js";
export const GET = (request: Request) => runFunnelRetention(request);
