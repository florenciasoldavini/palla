import { createClient } from "npm:@supabase/supabase-js@2.50.3";
import { createReportHandler } from "./request.ts";
export async function handler(req: Request) {
  const url = Deno.env.get("SUPABASE_URL"),
    anon = Deno.env.get("SUPABASE_ANON_KEY"),
    secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return createReportHandler({
    available: !!url && !!anon && !!secret,
    authenticate: async (authorization) => {
      const client = createClient(url!, anon!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data, error } = await client.auth.getUser();
      return !error && data.user && !data.user.is_anonymous
        ? data.user.id
        : null;
    },
    submit: async (body, actor) => {
      const admin = createClient(url!, secret!, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      return admin.rpc("submit_chat_report", {
        p_id: body.id,
        p_reporter_id: actor,
        p_conversation_id: body.conversation_id,
        p_reason: body.reason,
        p_details: body.details.trim(),
        p_block: body.block
      });
    }
  })(req);
}
