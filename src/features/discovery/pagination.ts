import { z } from "zod";
import { discoverySessionSchema, type DiscoverySession } from "./domain";
export const discoveryPageSize = 50;
export const discoveryCursorSchema = z.object({
  scope: z.string().regex(/^[a-f0-9]{32}$/),
  id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  price_minor: z.number().int().nonnegative(),
  distance_m: z.number().finite().nonnegative().nullable()
});
export type DiscoveryCursor = z.infer<typeof discoveryCursorSchema>;
export const discoveryPageSchema = z
  .object({
    sessions: z.array(discoverySessionSchema).max(100),
    has_more: z.boolean(),
    next_cursor: discoveryCursorSchema.nullable()
  })
  .refine(
    (p) =>
      p.has_more === (p.next_cursor !== null) &&
      (!p.has_more || p.sessions.length > 0),
    "Invalid discovery pagination"
  );
export type DiscoveryPage = z.infer<typeof discoveryPageSchema>;
export function mergeDiscoveryPages(
  pages: Pick<DiscoveryPage, "sessions">[]
): DiscoverySession[] {
  const seen = new Set<string>();
  return pages
    .flatMap((p) => p.sessions)
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
}
