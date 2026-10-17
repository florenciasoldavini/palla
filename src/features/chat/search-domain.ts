import { z } from "zod";
import { entityIdSchema } from "@/types/domain-schema";
import { chatMessageSchema } from "./domain";
export const chatSearchTermSchema = z.string().trim().min(1).max(200);
export const chatSearchPageSchema = z
  .object({
    total: z.number().int().nonnegative(),
    index: z.number().int().nonnegative().nullable(),
    selected_id: entityIdSchema.nullable(),
    messages: z.array(chatMessageSchema).max(25)
  })
  .refine((p) =>
    p.total === 0
      ? p.index === null && p.selected_id === null && p.messages.length === 0
      : p.index !== null &&
        p.index < p.total &&
        p.messages.some((m) => m.id === p.selected_id && !m.deleted_at)
  );
export type ChatSearchPage = z.infer<typeof chatSearchPageSchema>;
export type ChatSearchLoader = (
  id: string,
  term: string,
  index: number
) => Promise<ChatSearchPage>;
/** Literal matching; user punctuation is never interpreted as a regular expression. */
export function splitSearchText(body: string, term: string) {
  if (!term) return [{ text: body, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "giu");
  let end = 0;
  for (const match of body.matchAll(re)) {
    if (match.index > end)
      parts.push({ text: body.slice(end, match.index), match: false });
    parts.push({ text: match[0], match: true });
    end = match.index + match[0].length;
  }
  if (end < body.length) parts.push({ text: body.slice(end), match: false });
  return parts;
}
