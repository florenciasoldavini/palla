import { File } from "expo-file-system";
import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";
import { coverResultSchema } from "../domain";
export async function uploadCover(path: string, uri: string) {
  const bytes = await new File(uri).arrayBuffer();
  if (bytes.byteLength > 4 * 1024 * 1024)
    throw new Error("Cover photo must be smaller than 4 MB.");
  const { error } = await requireSupabase()
    .storage.from("session-covers")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  // Immutable UUID paths make retries safe, including a lost upload response.
  if (error && !["409", "Duplicate"].includes(String(error.statusCode)))
    throw error;
}
export async function removeUnusedCover(path: string) {
  // RLS prevents deleting any object referenced by a saved draft or occurrence.
  const { error } = await requireSupabase()
    .storage.from("session-covers")
    .remove([path]);
  if (error) throw error;
}
export async function ownCoverUrl(path: string) {
  const { data, error } = await requireSupabase()
    .storage.from("session-covers")
    .createSignedUrl(path, 1800);
  if (error) throw error;
  return data.signedUrl;
}
export async function requestSessionCover(sessionId: string) {
  const { data, error } = await requireSupabase().functions.invoke(
    "session-cover",
    { body: { sessionId } }
  );
  if (error) throw error;
  return coverResultSchema.parse(data);
}
