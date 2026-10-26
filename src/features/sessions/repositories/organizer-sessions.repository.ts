import { supabase } from "@/lib/supabase";
import {
  sessionSchema,
  sessionSeriesSchema,
  type PadelSession
} from "@/features/sessions/domain";
import { type SessionFormValues } from "@/features/sessions/validation/session-form";
import { venueSchema, type Venue } from "@/features/venues/domain";
import { z } from "zod";
import { removeUnusedCover } from "@/features/session-covers/repositories/cover.repository";

import {
  readInventoryPages,
  readInventoryAttributes
} from "./inventory-pagination";

export const seriesRecordSchema = sessionSeriesSchema;
export type SeriesRecord = z.infer<typeof seriesRecordSchema>;
export interface OrganizerInventory {
  series: SeriesRecord[];
  sessions: PadelSession[];
  venues: Venue[];
}
function client() {
  if (!supabase) throw new Error("Session access is unavailable.");
  return supabase;
}
export async function fetchOrganizerInventory(
  userId: string
): Promise<OrganizerInventory> {
  const [series, sessions, venues] = await Promise.all([
    readInventoryPages((from, to) =>
      client()
        .from("session_series")
        .select("*")
        .eq("organizer_id", userId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
    ),
    readInventoryPages((from, to) =>
      client()
        .from("sessions")
        .select("*")
        .eq("organizer_id", userId)
        .order("starts_at")
        .order("id")
        .range(from, to)
    ),
    readInventoryPages((from, to) =>
      client()
        .from("venues")
        .select("*")
        .eq("is_active", true)
        .order("name")
        .order("id")
        .range(from, to)
    )
  ]);
  const ids = (data: unknown[]) =>
    z
      .array(z.object({ id: z.string() }))
      .parse(data)
      .map((row) => row.id);
  const [seriesAttributes, sessionAttributes, venueAttributes] =
    await Promise.all([
      readInventoryAttributes(ids(series.data), (ids, from, to) =>
        client()
          .from("session_series_attributes")
          .select("series_id, attribute_code")
          .in("series_id", ids)
          .order("series_id")
          .order("attribute_code")
          .range(from, to)
      ),
      readInventoryAttributes(ids(sessions.data), (ids, from, to) =>
        client()
          .from("session_attributes")
          .select("session_id, attribute_code")
          .in("session_id", ids)
          .order("session_id")
          .order("attribute_code")
          .range(from, to)
      ),
      readInventoryAttributes(ids(venues.data), (ids, from, to) =>
        client()
          .from("organizer_venue_attributes")
          .select("venue_id, attribute_code")
          .eq("organizer_id", userId)
          .in("venue_id", ids)
          .order("venue_id")
          .order("attribute_code")
          .range(from, to)
      )
    ]);
  const group = (data: unknown, key: string) => {
    const rows = z.array(z.record(z.string(), z.string())).parse(data);
    const result = new Map<string, string[]>();
    for (const row of rows)
      result.set(row[key], [
        ...(result.get(row[key]) ?? []),
        row.attribute_code
      ]);
    return result;
  };
  const seriesCodes = group(seriesAttributes.data, "series_id");
  const sessionCodes = group(sessionAttributes.data, "session_id");
  const venueCodes = group(venueAttributes.data, "venue_id");
  const withCodes = (data: unknown, codes: Map<string, string[]>) =>
    z
      .array(z.object({ id: z.string() }).passthrough())
      .parse(data)
      .map((row) => ({ ...row, attributes: codes.get(row.id) ?? [] }));
  return {
    series: z
      .array(seriesRecordSchema)
      .parse(withCodes(series.data, seriesCodes)),
    sessions: z
      .array(sessionSchema)
      .parse(withCodes(sessions.data, sessionCodes)),
    venues: z.array(venueSchema).parse(withCodes(venues.data, venueCodes))
  };
}
export interface SaveSessionRequest {
  id: string;
  input: SessionFormValues & {
    venueCoordinates?: { reference: string };
  };
  publish: boolean;
  sessionId?: string;
  scope?: "one" | "future";
  expectedVersion?: string;
}
export async function fetchSavedCoverPath(request: SaveSessionRequest) {
  const one = Boolean(request.sessionId && request.scope !== "future");
  const { data, error } = await client()
    .from(one ? "sessions" : "session_series")
    .select("cover_image_path")
    .eq("id", one ? request.sessionId! : request.id)
    .maybeSingle();
  if (error) throw error;
  return data?.cover_image_path as string | null | undefined;
}
export async function saveSessionRecord(request: SaveSessionRequest) {
  const { data, error } = await client().rpc("save_organizer_session", {
    p_id: request.id,
    p_input: request.input,
    p_publish: request.publish,
    p_session_id: request.sessionId ?? null,
    p_scope: request.scope ?? "one",
    p_expected_version: request.expectedVersion ?? null
  });
  if (error) throw error;
  return z.uuid().parse(data);
}
export async function deleteDraftRecord(id: string, version: string) {
  const { data, error } = await client()
    .from("session_series")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .eq("updated_at", version)
    .select("id,cover_image_path")
    .single();
  if (error || !data)
    throw error ?? new Error("Session changed. Reload before saving");
  if (data.cover_image_path)
    await removeUnusedCover(data.cover_image_path).catch(() => {});
}

export async function setSeriesStatusRecord(request: {
  id: string;
  status: "active" | "paused" | "ended";
  expectedVersion: string;
}) {
  const { data, error } = await client().rpc("set_organizer_series_status", {
    p_id: request.id,
    p_status: request.status,
    p_expected_version: request.expectedVersion
  });
  if (error) throw error;
  return sessionSeriesSchema.parse(data);
}
