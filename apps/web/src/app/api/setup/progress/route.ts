/**
 * PRD-009b D4. `/api/setup/progress` is gone, and says so.
 *
 * This route stored the floating walkthrough's progress. The walkthrough is retired and nothing
 * writes progress, so there is no handler to run. What stays is the answer: without this file the
 * workspace's catch-all page takes the request and answers 200 with its not-found page, because the
 * response has begun streaming before it can say otherwise, and a removed write route that answers
 * 200 reads as one that still works. The answer is a 404 with no body, no session read, no database,
 * and no cache.
 *
 * A stored `guided_setup.v1` row is left in the database and is never read again (D4).
 */

function gone(_request: Request): Response {
  return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
}

export { gone as DELETE, gone as GET, gone as PATCH, gone as POST, gone as PUT };
