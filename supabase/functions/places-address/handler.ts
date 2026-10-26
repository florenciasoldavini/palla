import { createClient } from "npm:@supabase/supabase-js@2.50.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

import { addressTypes, placeLocation, matchesAddress } from "./location.ts";
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
      !["search", "details", "geocode"].includes(body.action) ||
      (body.action === "search" && typeof body.token !== "string") ||
      (body.token !== undefined &&
        (typeof body.token !== "string" ||
          !/^[a-zA-Z0-9_-]{16,64}$/.test(body.token)))
    )
      return jsonResponse({ error: "invalid" }, { status: 400 });
    if (
      ["search", "geocode"].includes(body.action) &&
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
    if (
      body.action === "details" &&
      body.input !== undefined &&
      (typeof body.input !== "string" ||
        body.input.trim().length < 3 ||
        body.input.length > 300)
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
    const searching = body.action === "search",
      geocoding = body.action === "geocode";
    const endpoint = searching
      ? "https://places.googleapis.com/v1/places:autocomplete"
      : geocoding
        ? "https://places.googleapis.com/v1/places:searchText"
        : `https://places.googleapis.com/v1/places/${encodeURIComponent(body.placeId)}?languageCode=es&regionCode=AR${body.token ? `&sessionToken=${encodeURIComponent(body.token)}` : ""}`;
    const response = await fetch(endpoint, {
      method: searching || geocoding ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": searching
          ? "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text"
          : geocoding
            ? "places.id,places.formattedAddress,places.types,places.location,places.addressComponents"
            : body.input
              ? "id,formattedAddress,types,location,addressComponents"
              : "id,formattedAddress,types,location"
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
        : geocoding
          ? JSON.stringify({
              textQuery: body.input.trim(),
              languageCode: "es",
              regionCode: "AR",
              pageSize: 1
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
    const rawPlace = geocoding ? data.places?.[0] : data;
    const place = rawPlace && placeLocation(rawPlace);
    if (
      !place ||
      ((geocoding || body.input !== undefined) &&
        !matchesAddress(body.input, rawPlace))
    )
      return jsonResponse({ error: "invalid_address" }, { status: 422 });
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey)
      return jsonResponse({ error: "unavailable" }, { status: 503 });
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: reference, error: cacheError } = await admin.rpc(
      "cache_google_place_location",
      {
        p_owner: auth.user.id,
        p_place_id: place.placeId,
        p_address: body.input !== undefined ? body.input.trim() : place.address,
        p_latitude: place.latitude,
        p_longitude: place.longitude
      }
    );
    if (cacheError || !reference)
      return jsonResponse({ error: "unavailable" }, { status: 503 });
    return jsonResponse({
      ...place,
      address: body.input !== undefined ? body.input.trim() : place.address,
      reference
    });
  } catch {
    return jsonResponse({ error: "unavailable" }, { status: 503 });
  }
}
