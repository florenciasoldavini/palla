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
Deno.test(
  "selected Google place returns a verified cache reference and requests coordinates",
  async () => {
    Deno.env.set("GOOGLE_PLACES_API_KEY", "test-only-not-a-real-key");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    const original = globalThis.fetch;
    let cached = false;
    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/auth/v1/user"))
        return Response.json({ id: "60000000-0000-4000-8000-000000000001" });
      if (url.includes("/rest/v1/organizers"))
        return Response.json({ status: "active" });
      if (url.includes("/rpc/reserve_places_request"))
        return Response.json("allowed");
      if (url.includes("places.googleapis.com")) {
        const headers = new Headers(init?.headers);
        assert(
          headers.get("X-Goog-FieldMask")?.includes("location"),
          "Coordinates requested from Google"
        );
        return Response.json({
          id: "google-place",
          formattedAddress: "Santa Fe 4000, Buenos Aires",
          types: ["street_address"],
          location: { latitude: -34.58, longitude: -58.42 }
        });
      }
      if (url.includes("/rpc/cache_google_place_location")) {
        const body = JSON.parse(String(init?.body));
        assert(
          body.p_owner === "60000000-0000-4000-8000-000000000001",
          "Cache owned by verified user"
        );
        assert(
          body.p_latitude === -34.58 && body.p_place_id === "google-place",
          "Canonical provider coordinates cached"
        );
        cached = true;
        return Response.json("10000000-0000-4000-8000-000000000001");
      }
      throw new Error("Unexpected request");
    };
    try {
      const response = await handler(
        new Request("https://example.test", {
          method: "POST",
          headers: { Authorization: "Bearer test-token" },
          body: JSON.stringify({ action: "details", placeId: "google-place" })
        })
      );
      assert(response.status === 200, "Successful details lookup");
      const body = await response.json();
      assert(
        cached && body.reference && body.longitude === -58.42,
        "Reference and coordinates returned"
      );
      assert(
        !JSON.stringify(body).includes("test-service-key"),
        "No server credential exposed"
      );
    } finally {
      globalThis.fetch = original;
      Deno.env.delete("GOOGLE_PLACES_API_KEY");
      Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    }
  }
);
Deno.test(
  "publishing a saved place preserves a verified manual address and rejects mismatches",
  async () => {
    Deno.env.set("SUPABASE_URL", "https://example.test");
    Deno.env.set("SUPABASE_ANON_KEY", "test");
    Deno.env.set("GOOGLE_PLACES_API_KEY", "test-provider-key");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    const original = globalThis.fetch;
    const inputAddress = "Avenida Santa Fe 4000, Buenos Aires";
    let cached = 0;
    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/auth/v1/user"))
        return Response.json({ id: "60000000-0000-4000-8000-000000000001" });
      if (url.includes("/rest/v1/organizers"))
        return Response.json({ status: "active" });
      if (url.includes("/rpc/reserve_places_request"))
        return Response.json("allowed");
      if (url.includes("places.googleapis.com"))
        return Response.json({
          id: "google-place",
          formattedAddress: "Av. Santa Fe 4000, Buenos Aires",
          types: ["street_address"],
          location: { latitude: -34.58, longitude: -58.42 },
          addressComponents: [
            { longText: "4000", types: ["street_number"] },
            { longText: "Avenida Santa Fe", types: ["route"] },
            { longText: "Buenos Aires", types: ["locality"] }
          ]
        });
      if (url.includes("/rpc/cache_google_place_location")) {
        assert(
          JSON.parse(String(init?.body)).p_address === inputAddress,
          "Cache matches the saved venue address"
        );
        cached++;
        return Response.json("10000000-0000-4000-8000-000000000001");
      }
      throw new Error("Unexpected request");
    };
    try {
      for (const [address, status] of [
        [inputAddress, 200],
        ["Another street 4000, Rosario", 422]
      ] as const) {
        const response = await handler(
          new Request("https://example.test", {
            method: "POST",
            headers: { Authorization: "Bearer test-token" },
            body: JSON.stringify({
              action: "details",
              placeId: "google-place",
              input: address
            })
          })
        );
        assert(
          response.status === status,
          "Only a matching saved address is accepted"
        );
        if (status === 200)
          assert(
            (await response.json()).address === inputAddress,
            "Saved address formatting is preserved"
          );
      }
      assert(cached === 1, "A mismatch cannot create a verified reference");
    } finally {
      globalThis.fetch = original;
      Deno.env.delete("GOOGLE_PLACES_API_KEY");
      Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    }
  }
);
