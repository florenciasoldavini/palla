import { z } from "zod";

export const sharedSessionSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  starts_at: z.string(),
  timezone: z.string(),
  venue: z.object({ name: z.string().nullable() }),
  host: z.object({ name: z.string() })
});
export type SharedSession = z.infer<typeof sharedSessionSchema>;
export function backendConfig() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Sharing backend unavailable");
  return { url, key };
}
export async function sharedSession(id: string, fetcher = fetch) {
  const { url, key } = backendConfig();
  // Deliberately anonymous: neither viewer cookies nor Authorization are forwarded.
  const response = await fetcher(
    `${url}/rest/v1/rpc/get_public_session_detail`,
    {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_session_id: id }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store"
    }
  );
  if (!response.ok) throw new Error("Sharing backend unavailable");
  return sharedSessionSchema.nullable().parse(await response.json());
}
export async function sharedCover(id: string, fetcher = fetch) {
  const { url, key } = backendConfig();
  const anon = process.env.SESSION_SHARE_SUPABASE_ANON_KEY;
  if (!anon) throw new Error("Cover access unavailable");
  const response = await fetcher(`${url}/functions/v1/session-cover`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionId: id }),
    signal: AbortSignal.timeout(22000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Cover access unavailable");
  return z
    .object({
      url: z.url().nullable(),
      source: z.enum(["upload", "google", "none"]),
      authors: z.array(z.object({ name: z.string() }))
    })
    .parse(await response.json());
}
export function permittedCoverUrl(value: string, source: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password)
    return false;
  if (source === "google")
    return parsed.hostname.endsWith(".googleusercontent.com");
  return (
    source === "upload" &&
    parsed.origin === new URL(backendConfig().url).origin &&
    parsed.pathname.startsWith("/storage/v1/object/sign/session-covers/")
  );
}
