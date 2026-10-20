import { supabase } from "@/lib/supabase";
import {
  sessionSchema,
  sessionSeriesSchema,
  type PadelSession
} from "@/features/sessions/domain";
import { type SessionFormValues } from "@/features/sessions/validation/session-form";
import { venueSchema, type Venue } from "@/features/venues/domain";
import { z } from "zod";

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
    client()
      .from("session_series")
      .select("*")
      .eq("organizer_id", userId)
      .order("created_at", { ascending: false }),
    client()
      .from("sessions")
      .select("*")
      .eq("organizer_id", userId)
      .order("starts_at"),
    client().from("venues").select("*").eq("is_active", true).order("name")
  ]);
  for (const result of [series, sessions, venues])
    if (result.error) throw result.error;
  return {
    series: z.array(seriesRecordSchema).parse(series.data),
    sessions: z.array(sessionSchema).parse(sessions.data),
    venues: z.array(venueSchema).parse(venues.data)
  };
}
export interface SaveSessionRequest {
  id: string;
  input: SessionFormValues;
  publish: boolean;
  sessionId?: string;
  scope?: "one" | "future";
  expectedVersion?: string;
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
    .select("id")
    .single();
  if (error || !data)
    throw error ?? new Error("Session changed. Reload before saving");
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
