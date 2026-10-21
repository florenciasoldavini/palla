import { describe, expect, it, vi, afterEach } from "vitest";
import {
  injectSessionMetadata,
  sessionMetadata,
  sessionDescription
} from "./metadata";
import { sharedSession, permittedCoverUrl } from "./repository";
import { GET as association } from "../../../api/app-links";
const s = {
  id: "11111111-1111-4111-8111-111111111111",
  title: 'Friday <Padel> & "friends"',
  description: "A friendly session.\nBring a racket.",
  starts_at: "2026-10-23T22:00:00Z",
  timezone: "America/Argentina/Buenos_Aires",
  venue: { name: "Club Padel" },
  host: { name: "Alex" }
};
afterEach(() => vi.unstubAllEnvs());
describe("session sharing metadata", () => {
  it("uses session-specific escaped title, description, canonical and stable image URLs", () => {
    const html = sessionMetadata(s);
    expect(html).toContain(
      'content="Friday &lt;Padel&gt; &amp; &quot;friends&quot;"'
    );
    expect(html).toContain('content="A friendly session. Bring a racket."');
    expect(html).toContain(
      `https://palla-pink.vercel.app/api/session-image?id=${s.id}`
    );
    expect(html).not.toContain("token=");
    expect(html).toContain(`https://palla-pink.vercel.app/session?id=${s.id}`);
  });
  it("replaces generic previews rather than leaving duplicate OG tags", () => {
    const html = injectSessionMetadata(
      '<html><head><title>Palla</title><meta property="og:title" content="Generic"><meta name="twitter:image" content="old"><meta name="description" content="old"></head><body>App</body></html>',
      s
    );
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/name="twitter:image"/g)).toHaveLength(1);
    expect(html).not.toContain("Generic");
    expect(html).toContain("<body>App</body>");
  });
  it("uses actual schedule, venue and host when there is no description", () => {
    const summary = sessionDescription({ ...s, description: null });
    expect(summary).toContain("23 Oct");
    expect(summary).toContain("19:00");
    expect(summary).toContain("Club Padel");
  });
  it("never forwards a signed-in viewer to anonymous session lookup", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    const fetcher = vi.fn(async () => Response.json(null));
    expect(await sharedSession(s.id, fetcher)).toBeNull();
    const init = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[1].headers).toEqual({
      apikey: "public-key",
      "Content-Type": "application/json"
    });
  });
  it("accepts only trusted cover origins and denies arbitrary image fetches", () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    expect(
      permittedCoverUrl(
        "https://project.supabase.co/storage/v1/object/sign/session-covers/a.jpg?token=x",
        "upload"
      )
    ).toBe(true);
    expect(permittedCoverUrl("https://attacker.test/a.jpg", "upload")).toBe(
      false
    );
    expect(permittedCoverUrl("http://127.0.0.1/internal", "google")).toBe(
      false
    );
    expect(
      permittedCoverUrl("https://lh3.googleusercontent.com/photo", "google")
    ).toBe(true);
  });
  it("does not invent signing identities", async () => {
    vi.stubEnv("APPLE_TEAM_ID", "");
    vi.stubEnv("ANDROID_APP_LINK_FINGERPRINTS", "");
    expect(
      association(
        new Request("https://palla-pink.vercel.app/api/app-links?platform=ios")
      ).status
    ).toBe(503);
    expect(
      association(
        new Request(
          "https://palla-pink.vercel.app/api/app-links?platform=android"
        )
      ).status
    ).toBe(503);
    vi.stubEnv("APPLE_TEAM_ID", "ABCDE12345");
    expect(
      await association(
        new Request("https://palla-pink.vercel.app/api/app-links?platform=ios")
      ).json()
    ).toMatchObject({
      applinks: {
        details: [
          {
            appID: "ABCDE12345.com.florenciasoldavini.palla",
            paths: ["/session"]
          }
        ]
      }
    });
  });
});
