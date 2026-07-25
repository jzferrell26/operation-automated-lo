// Edge Function skeleton (Deno). Lives at supabase/functions/<name>/index.ts.
// Auto-injected env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Never re-declare those as user secrets. See guides/02-edge-functions.md.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // CORS preflight (adjust the allowed origin to your app).
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // RLS-scoped client: pass the caller's JWT through so their policies apply.
  // Use this for anything user-facing. Requires verify_jwt = true (default).
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  // Admin client: bypasses RLS. Server-side only, for privileged paths.
  // const adminClient = createClient(
  //   Deno.env.get("SUPABASE_URL")!,
  //   Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  // );

  // External secret (set via `supabase secrets set`), read with Deno.env.get:
  // const resendKey = Deno.env.get("RESEND_API_KEY");

  const { data, error } = await userClient.from("docs").select("id").limit(1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, data }), {
    headers: { "Content-Type": "application/json" },
  });
});
