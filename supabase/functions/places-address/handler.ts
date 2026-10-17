import { createClient } from "npm:@supabase/supabase-js@2.50.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const addressTypes = ["street_address", "premise", "subpremise"];
export async function handler(req: Request) {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "method" }, { status: 405 });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return jsonResponse({ error: "sign_in" }, { status: 401 });
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey)
    return jsonResponse({ error: "unavailable" }, { status: 503 });
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user)
    return jsonResponse({ error: "sign_in" }, { status: 401 });
  try {
    const raw = await req.text();
    if (raw.length > 2048)
      return jsonResponse({ error: "invalid" }, { status: 400 });
    const body = JSON.parse(raw);
    if (
      !body ||
      !["search", "details"].includes(body.action) ||
      typeof body.token !== "string" ||
      !/^[a-zA-Z0-9_-]{16,64}$/.test(body.token)
    )
      return jsonResponse({ error: "invalid" }, { status: 400 });
    if (
      body.action === "search" &&
      (typeof body.input !== "string" ||
        body.input.trim().length < 3 ||
        body.input.length > 300)
    )
      return jsonResponse({ error: "invalid" }, { status: 400 });
    if (
      body.action === "details" &&
      (typeof body.placeId !== "string" ||
        !/^[a-zA-Z0-9_-]{1,512}$/.test(body.placeId))
    )
      return jsonResponse({ error: "invalid" }, { status: 400 });
    const key = Deno.env.get("GOOGLE_PLACES_API_KEY");
    // Check trusted organizer state even when the provider is not configured.
    const { data: organizer } = await client
      .from("organizers")
      .select("status")
      .eq("profile_id", auth.user.id)
      .single();
    if (organizer?.status !== "active")
      return jsonResponse({ error: "organizer" }, { status: 403 });
    if (!key) return jsonResponse({ error: "not_configured" }, { status: 503 });
    const quota = await client.rpc("reserve_places_request");
    if (quota.error)
      return jsonResponse({ error: "unavailable" }, { status: 503 });
    if (quota.data === "monthly_limit" || quota.data === "rate_limit")
      return jsonResponse({ error: quota.data }, { status: 429 });
    if (quota.data !== "allowed")
      return jsonResponse({ error: "unavailable" }, { status: 503 });
    const searching = body.action === "search";
    const endpoint = searching
      ? "https://places.googleapis.com/v1/places:autocomplete"
      : `https://places.googleapis.com/v1/places/${encodeURIComponent(body.placeId)}?languageCode=es&regionCode=AR&sessionToken=${encodeURIComponent(body.token)}`;
    const response = await fetch(endpoint, {
      method: searching ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": searching
          ? "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text"
          : "formattedAddress,types"
      },
      body: searching
        ? JSON.stringify({
            input: body.input.trim(),
            sessionToken: body.token,
            includedRegionCodes: ["ar"],
            includedPrimaryTypes: addressTypes,
            languageCode: "es",
            locationBias: {
              circle: {
                center: { latitude: -34.6037, longitude: -58.3816 },
                radius: 50000
              }
            }
          })
        : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok)
      return jsonResponse({ error: "provider_unavailable" }, { status: 503 });
    const data = await response.json();
    if (searching)
      return jsonResponse({
        suggestions: (data.suggestions ?? [])
          .flatMap(
            (s: {
              placePrediction?: { placeId?: string; text?: { text?: string } };
            }) => {
              const p = s.placePrediction;
              return p?.placeId && p.text?.text
                ? [{ id: p.placeId, label: p.text.text }]
                : [];
            }
          )
          .slice(0, 5)
      });
    if (
      !data.types?.some((t: string) => addressTypes.includes(t)) ||
      typeof data.formattedAddress !== "string"
    )
      return jsonResponse({ error: "invalid_address" }, { status: 422 });
    return jsonResponse({ address: data.formattedAddress });
  } catch {
    return jsonResponse({ error: "unavailable" }, { status: 503 });
  }
}
