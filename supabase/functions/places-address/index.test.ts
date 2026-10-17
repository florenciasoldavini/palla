import { handler } from "./handler.ts";
function assert(value: unknown, message: string) {
  if (!value) throw new Error(message);
}
Deno.test("rejects unsigned callers without any network requests", async () => {
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = () => {
    called = true;
    throw new Error("Network forbidden");
  };
  try {
    const response = await handler(
      new Request("https://example.test", { method: "POST", body: "{}" })
    );
    assert(response.status === 401, "Expected auth rejection");
    assert(!called, "No provider call");
  } finally {
    globalThis.fetch = original;
  }
});
Deno.test(
  "signed-in organizer without provider key gets safe configured response",
  async () => {
    Deno.env.set("SUPABASE_URL", "https://example.test");
    Deno.env.set("SUPABASE_ANON_KEY", "test");
    Deno.env.delete("GOOGLE_PLACES_API_KEY");
    const original = globalThis.fetch;
    const requests: string[] = [];
    globalThis.fetch = async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      requests.push(url);
      if (url.includes("/auth/v1/user"))
        return Response.json({ id: "60000000-0000-4000-8000-000000000001" });
      if (url.includes("/rest/v1/organizers"))
        return Response.json({ status: "active" });
      throw new Error("Unexpected provider request");
    };
    try {
      const response = await handler(
        new Request("https://example.test", {
          method: "POST",
          headers: { Authorization: "Bearer test-token" },
          body: JSON.stringify({
            action: "search",
            input: "Monroe 5765",
            token: "60000000-0000-4000-8000-000000000001"
          })
        })
      );
      assert(response.status === 503, "Provider not configured");
      assert(
        (await response.json()).error === "not_configured",
        "Safe error code"
      );
      assert(requests.length === 2, "Auth and trusted organizer check only");
    } finally {
      globalThis.fetch = original;
    }
  }
);
Deno.test("non-organizer cannot trigger paid lookup", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes("/auth/v1/user"))
      return Response.json({ id: "60000000-0000-4000-8000-000000000003" });
    if (url.includes("/rest/v1/organizers")) return Response.json(null);
    throw new Error("Paid call forbidden");
  };
  try {
    const response = await handler(
      new Request("https://example.test", {
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          action: "search",
          input: "Monroe 5765",
          token: "60000000-0000-4000-8000-000000000001"
        })
      })
    );
    assert(response.status === 403, "Organizer required");
  } finally {
    globalThis.fetch = original;
  }
});
Deno.test("monthly exhaustion prevents a Google request", async () => {
  Deno.env.set("GOOGLE_PLACES_API_KEY", "test-only-not-a-real-key");
  const original = globalThis.fetch;
  let providerCalled = false;
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes("/auth/v1/user"))
      return Response.json({ id: "60000000-0000-4000-8000-000000000001" });
    if (url.includes("/rest/v1/organizers"))
      return Response.json({ status: "active" });
    if (url.includes("/rpc/reserve_places_request"))
      return Response.json("monthly_limit");
    providerCalled = true;
    throw new Error("Provider must not be called");
  };
  try {
    const response = await handler(
      new Request("https://example.test", {
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          action: "search",
          input: "Monroe 5765",
          token: "60000000-0000-4000-8000-000000000001"
        })
      })
    );
    assert(response.status === 429, "Monthly cap rejected");
    assert(
      (await response.json()).error === "monthly_limit",
      "Explicit monthly limit"
    );
    assert(!providerCalled, "No paid lookup after exhaustion");
  } finally {
    globalThis.fetch = original;
    Deno.env.delete("GOOGLE_PLACES_API_KEY");
  }
});
