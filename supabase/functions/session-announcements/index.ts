import { createClient } from "npm:@supabase/supabase-js@2.50.3";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers });
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return json({ error: "Authentication required" }, 401);
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );
  const {
    data: { user },
    error: authError
  } = await db.auth.getUser(authorization.slice(7));
  if (!user || authError)
    return json({ error: "Authentication required" }, 401);
  try {
    const text = await request.text();
    if (text.length > 12000)
      return json({ error: "Use up to 1,000 characters." }, 400);
    const input = JSON.parse(text);
    if (
      !input ||
      typeof input.body !== "string" ||
      !input.body.trim() ||
      [...input.body.trim()].length > 1000 ||
      !Number.isInteger(input.expected_count) ||
      input.expected_count < 1
    )
      return json({ error: "Write a message of up to 1,000 characters." }, 400);
    const { data, error } = await db.rpc("publish_session_announcement", {
      p_session: input.session_id,
      p_body: input.body,
      p_request: input.request_id,
      p_expected_count: input.expected_count
    });
    if (error) {
      const safe = [
        "Write a message",
        "Announcements are only",
        "There are no confirmed",
        "The recipient count changed",
        "Please wait a minute",
        "Send request already used"
      ].some((prefix) => error.message.startsWith(prefix));
      return json(
        {
          error: safe
            ? error.message
            : "Announcement unavailable. Refresh the session and try again."
        },
        error.code === "42501" ? 403 : 400
      );
    }
    return json(data);
  } catch {
    return json(
      {
        error:
          "Couldn’t send announcement. Check your connection and try again."
      },
      400
    );
  }
});
