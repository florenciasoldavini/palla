import { createClient } from "npm:@supabase/supabase-js@2.50.3";
import { runPushWorker } from "./worker.ts";
import { runReviewPushWorker } from "./review-worker.ts";
Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const secret = request.headers.get("x-chat-push-secret");
  if (!secret || secret.length !== 64)
    return new Response(null, { status: 401 });
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );
  const rpc = async (name: string, args?: Record<string, unknown>) => {
    const { data, error } = await db.rpc(name, args);
    if (error) throw new Error("Push database operation failed");
    return data;
  };
  try {
    if (
      (await rpc("authorize_chat_push_worker", { p_secret: secret })) !== true
    )
      return new Response(null, { status: 401 });
    const dependencies = {
      rpc,
      fetcher: fetch,
      accessToken: Deno.env.get("EXPO_ACCESS_TOKEN")
    };
    const results = await Promise.allSettled([
      runPushWorker(dependencies),
      runReviewPushWorker(dependencies)
    ]);
    if (results.some((result) => result.status === "rejected"))
      return Response.json(
        { error: "Push delivery temporarily unavailable" },
        { status: 503 }
      );
    return Response.json(
      results.map((result) =>
        result.status === "fulfilled" ? result.value : null
      )
    );
  } catch {
    return Response.json(
      { error: "Push delivery temporarily unavailable" },
      { status: 503 }
    );
  }
});
