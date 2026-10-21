import { z } from "zod";
export const coverPathSchema = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
export const coverResultSchema = z.object({
  url: z.string().url().nullable(),
  source: z.enum(["upload", "google", "none"]),
  authors: z
    .array(z.object({ name: z.string(), url: z.string().url().nullable() }))
    .default([]),
  googleMapsUrl: z.string().url().nullable().default(null)
});
export type SessionCover = z.infer<typeof coverResultSchema>;
export function effectiveCover(
  override: string | null,
  inherited: string | null
) {
  return override ?? inherited;
}
