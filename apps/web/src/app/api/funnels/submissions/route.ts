import { downloadFunnelInquiries } from "../../../../server/funnel-submissions.js";
export const GET = (request: Request) => downloadFunnelInquiries(request);
