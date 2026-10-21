import { createClient } from "npm:@supabase/supabase-js@2.50.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { resolveGooglePhoto } from "./google-photo.ts";
const none = { url: null, source: "none", authors: [], googleMapsUrl: null };
Deno.serve(async (req: Request) => {
  const reply = (data: Record<string, unknown>, status = 200) =>
    jsonResponse(data, { status, headers: { "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "method" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 200) return reply({ error: "invalid" }, 400);
    const { sessionId } = JSON.parse(raw);
    if (typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/.test(sessionId))
      return reply({ error: "invalid" }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const viewer = createClient(url, anon, {
      global: {
        headers: req.headers.get("Authorization")
          ? { Authorization: req.headers.get("Authorization")! }
          : {}
      },
      auth: { persistSession: false }
    });
    const { data: visible, error } = await viewer.rpc(
      "get_public_session_detail",
      { p_session_id: sessionId }
    );
    if (error || !visible) return reply({ error: "unavailable" }, 404);
    const admin = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const { data: record, error: readError } = await admin
      .from("sessions")
      .select("cover_image_path,inherited_cover_image_path")
      .eq("id", sessionId)
      .single();
    if (readError) return reply(none);
    for (const path of [
      ...new Set([record.cover_image_path, record.inherited_cover_image_path])
    ].filter(Boolean)) {
      const { data: photo, error: signError } = await admin.storage
        .from("session-covers")
        .createSignedUrl(path, 1800);
      if (!signError && photo)
        return reply({
          url: photo.signedUrl,
          source: "upload",
          authors: [],
          googleMapsUrl: null
        });
    }
    const key = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!key || !visible.venue.name || !visible.venue.address)
      return reply(none);
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(ip)
    );
    const hash = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const quota = await admin.rpc("reserve_cover_photo_request", {
      p_client_hash: hash
    });
    if (quota.error || quota.data !== true) return reply(none);
    return reply((await resolveGooglePhoto(visible.venue, key)) ?? none);
  } catch {
    return reply(none);
  }
});
