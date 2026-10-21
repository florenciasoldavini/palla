import { sessionOrigin } from "@/config/session-links";
import { z } from "zod";
import { publicSessionSchema } from "../domain";
import { fetchPublicSession } from "../repositories/public-session.repository";

export async function loadPublicSession(id: string, signal?: AbortSignal) {
  if (!z.uuid().safeParse(id).success) return null;
  return publicSessionSchema
    .nullable()
    .parse(await fetchPublicSession(id, signal));
}

export function publicSessionLink(
  id: string,
  base = process.env.EXPO_PUBLIC_SESSION_SHARE_URL
) {
  z.uuid().parse(id);
  return `${sessionOrigin(base)}/session?id=${encodeURIComponent(id)}`;
}
export function venueDirectionsUrl(venue: {
  name: string | null;
  address: string | null;
  google_place_id: string | null;
}) {
  if (!venue.address && !venue.google_place_id) return null;
  const query =
    [venue.name, venue.address].filter(Boolean).join(", ") || "Padel court";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${venue.google_place_id ? `&query_place_id=${encodeURIComponent(venue.google_place_id)}` : ""}`;
}
