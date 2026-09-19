import { handleReviewSignOut } from "../../../../../server/review-session-handler.js";

export async function POST(request: Request) {
  return handleReviewSignOut(request);
}
