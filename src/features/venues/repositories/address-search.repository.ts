import { supabase } from "@/lib/supabase";
import { z } from "zod";
export const addressSuggestionsSchema = z.object({
  suggestions: z.array(z.object({ id: z.string(), label: z.string() })).max(5)
});
export type AddressSuggestion = z.infer<
  typeof addressSuggestionsSchema
>["suggestions"][number];
export async function requestAddress(
  body:
    | { action: "search"; input: string; token: string }
    | { action: "details"; placeId: string; token: string }
) {
  if (!supabase) throw new Error("unavailable");
  const { data, error } = await supabase.functions.invoke("places-address", {
    body
  });
  if (error) {
    const response = "context" in error ? error.context : undefined;
    let code = "unavailable";
    if (response instanceof Response) {
      try {
        code = (await response.json()).error ?? code;
      } catch {
        /* Network failure. */
      }
    }
    throw new Error(code);
  }
  return data;
}
