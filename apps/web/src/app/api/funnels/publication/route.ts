import { handlePublication } from "../../../../server/funnel-public-http.js";
export const GET = (request: Request) => handlePublication(request);
export const POST = (request: Request) => handlePublication(request);
export const DELETE = (request: Request) => handlePublication(request);
