// @ts-ignore Deno deployments require explicit extensions; the app test runner resolves this source.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reasons = [
  "harassment",
  "spam",
  "inappropriate_content",
  "impersonation",
  "other"
];
type Input = {
  id: string;
  conversation_id: string;
  reason: string;
  details: string;
  block: boolean;
};
export function createReportHandler(deps: {
  available: boolean;
  authenticate: (authorization: string) => Promise<string | null>;
  submit: (
    input: Input,
    actor: string
  ) => Promise<{
    data: Record<string, unknown> | null;
    error: { code?: string; message?: string } | null;
  }>;
}) {
  return async (req: Request) => {
    if (req.method === "OPTIONS")
      return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST")
      return jsonResponse({ error: "method" }, { status: 405 });
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer "))
      return jsonResponse({ error: "sign_in" }, { status: 401 });
    if (!deps.available)
      return jsonResponse({ error: "unavailable" }, { status: 503 });
    try {
      const actor = await deps.authenticate(authorization);
      if (!actor) return jsonResponse({ error: "sign_in" }, { status: 401 });
      // Reject oversized bodies before parsing. No client-supplied reporter or evidence is accepted.
      if (Number(req.headers.get("Content-Length")) > 16000)
        return jsonResponse({ error: "invalid" }, { status: 400 });
      const reader = req.body?.getReader();
      let raw = "",
        size = 0;
      const decoder = new TextDecoder();
      if (!reader) return jsonResponse({ error: "invalid" }, { status: 400 });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 16000) {
          await reader.cancel();
          return jsonResponse({ error: "invalid" }, { status: 400 });
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return jsonResponse({ error: "invalid" }, { status: 400 });
      }
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).some(
          (k) =>
            !["id", "conversation_id", "reason", "details", "block"].includes(k)
        ) ||
        typeof body.id !== "string" ||
        !uuid.test(body.id) ||
        typeof body.conversation_id !== "string" ||
        !uuid.test(body.conversation_id) ||
        !reasons.includes(body.reason) ||
        typeof body.details !== "string" ||
        body.details.trim().length > 2000 ||
        typeof body.block !== "boolean"
      )
        return jsonResponse({ error: "invalid" }, { status: 400 });

      const { data, error } = await deps.submit(body, actor);
      if (error) {
        const code =
          error.code === "42501"
            ? "access"
            : error.message === "Report limit reached"
              ? "rate_limit"
              : error.code === "22023"
                ? "invalid"
                : "unavailable";
        return jsonResponse(
          { error: code },
          {
            status:
              code === "access"
                ? 403
                : code === "rate_limit"
                  ? 429
                  : code === "invalid"
                    ? 400
                    : 503
          }
        );
      }
      if (!data) return jsonResponse({ error: "unavailable" }, { status: 503 });
      return jsonResponse(data);
    } catch {
      return jsonResponse({ error: "unavailable" }, { status: 503 });
    }
  };
}
