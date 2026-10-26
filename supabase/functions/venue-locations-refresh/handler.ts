import { createClient } from "npm:@supabase/supabase-js@2.50.3";
export async function handler(req: Request) {
  if (req.method !== "POST")
    return Response.json({ error: "method" }, { status: 405 });
  const secret = req.headers.get("x-worker-secret");
  if (!secret || !/^[a-f0-9]{64}$/.test(secret))
    return Response.json({ error: "unauthorized" }, { status: 401 });
  const url = Deno.env.get("SUPABASE_URL"),
    serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!url || !serviceKey || !googleKey)
    return Response.json({ error: "unavailable" }, { status: 503 });
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await admin.rpc("claim_google_venue_refresh", {
    p_secret: secret
  });
  if (error) return Response.json({ error: "unauthorized" }, { status: 401 });
  let refreshed = 0,
    failed = 0;
  // Bounded concurrency; each claim reserves its Google request against the
  // shared monthly cap before any provider request is made.
  const rows = (data ?? []) as { id: string; place_id: string }[];
  for (let i = 0; i < rows.length; i += 5)
    await Promise.all(
      rows.slice(i, i + 5).map(async (row) => {
        try {
          const response = await fetch(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(row.place_id)}`,
            {
              headers: {
                "X-Goog-Api-Key": googleKey,
                "X-Goog-FieldMask": "id,location"
              },
              redirect: "error",
              signal: AbortSignal.timeout(8000)
            }
          );
          if (!response.ok) throw new Error("Provider unavailable");
          const place = await response.json(),
            lat = place.location?.latitude,
            lng = place.location?.longitude;
          if (
            place.id !== row.place_id ||
            typeof lat !== "number" ||
            !Number.isFinite(lat) ||
            Math.abs(lat) > 90 ||
            typeof lng !== "number" ||
            !Number.isFinite(lng) ||
            Math.abs(lng) > 180
          )
            throw new Error("Invalid location");
          const result = await admin.rpc("refresh_google_venue_location", {
            p_id: row.id,
            p_place_id: row.place_id,
            p_latitude: lat,
            p_longitude: lng
          });
          if (result.error) throw new Error("Update failed");
          refreshed++;
        } catch {
          failed++;
        }
      })
    );
  return Response.json({ refreshed, failed });
}
