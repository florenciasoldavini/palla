import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { GET as page } from "../../../api/session";
import { GET as image } from "../../../api/session-image";
import { sharedSession, sharedCover } from "./repository";
vi.mock("./repository", () => ({
  sharedSession: vi.fn(),
  sharedCover: vi.fn(),
  permittedCoverUrl: vi.fn(() => true)
}));
const id = "11111111-1111-4111-8111-111111111111";
const request = (path: string) =>
  new Request(`https://palla-pink.vercel.app/${path}?id=${id}`);
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
describe("public sharing handlers", () => {
  it("never resolves covers or leaks metadata for private/unavailable sessions", async () => {
    vi.mocked(sharedSession).mockResolvedValue(null);
    const response = await page(request("session"));
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("og:image");
    expect((await image(request("api/session-image"))).status).toBe(404);
    expect(sharedCover).not.toHaveBeenCalled();
  });
  it("returns retryable failure when visibility cannot be checked", async () => {
    vi.mocked(sharedSession).mockRejectedValue(new Error("offline"));
    expect((await image(request("api/session-image"))).status).toBe(503);
    expect((await page(request("session"))).headers.get("Retry-After")).toBe(
      "30"
    );
  });
  it("transforms an uploaded cover into a stable social JPEG", async () => {
    vi.mocked(sharedSession).mockResolvedValue({
      id,
      title: "Padel",
      description: null,
      starts_at: "2026-10-23T22:00:00Z",
      timezone: "UTC",
      venue: { name: "Club" },
      host: { name: "Host" }
    });
    vi.mocked(sharedCover).mockResolvedValue({
      url: "https://project.supabase.co/cover",
      source: "upload",
      authors: []
    });
    const { permittedCoverUrl } = await import("./repository");
    vi.mocked(permittedCoverUrl).mockReturnValue(true);
    const source = await sharp({
      create: { width: 600, height: 400, channels: 3, background: "#bfff00" }
    })
      .png()
      .toBuffer();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array(source), {
            headers: { "Content-Type": "image/png" }
          })
      )
    );
    const response = await image(request("api/session-image"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const metadata = await sharp(
      Buffer.from(await response.arrayBuffer())
    ).metadata();
    expect(metadata).toMatchObject({
      width: 1200,
      height: 630,
      format: "jpeg"
    });
  });
});
