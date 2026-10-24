import { handler } from "./handler.ts";
Deno.test(
  "rejects unsigned refresh requests without making network calls",
  async () => {
    const original = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error("Network forbidden");
    };
    try {
      const result = await handler(
        new Request("https://example.test", { method: "POST" })
      );
      if (result.status !== 401)
        throw new Error("Unsigned worker request accepted");
    } finally {
      globalThis.fetch = original;
    }
  }
);
Deno.test(
  "an invalid worker secret cannot trigger a paid Google call",
  async () => {
    Deno.env.set("SUPABASE_URL", "https://example.test");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    Deno.env.set("GOOGLE_PLACES_API_KEY", "test-provider-key");
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/rpc/claim_google_venue_refresh"))
        return Response.json(
          { message: "Worker access required" },
          { status: 403 }
        );
      throw new Error("Paid call forbidden");
    };
    try {
      const response = await handler(
        new Request("https://example.test", {
          method: "POST",
          headers: { "x-worker-secret": "a".repeat(64) }
        })
      );
      if (response.status !== 401) throw new Error("Invalid secret accepted");
    } finally {
      globalThis.fetch = original;
      Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
      Deno.env.delete("GOOGLE_PLACES_API_KEY");
    }
  }
);
