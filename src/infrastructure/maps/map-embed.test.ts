import { describe, expect, it } from "vitest";
import { mapEmbedHtml } from "./map-embed";

describe("minimal map document", () => {
  it("uses real vector streets with the approved palette and no provider controls", () => {
    const html = mapEmbedHtml({ longitude: -58.42, latitude: -34.58 });
    expect(html).toContain("https://tiles.openfreemap.org/planet");
    expect(html).toContain('"source-layer":"transportation"');
    expect(html).toContain("#f0eef8");
    expect(html).toContain("interactive:false");
    expect(html).toContain("report('loaded')");
    expect(html).not.toContain("maps.google.com");
    expect(html).not.toContain("<iframe");
  });
  it("rejects out-of-bounds and nonfinite coordinates", () => {
    expect(() => mapEmbedHtml({ longitude: 181, latitude: 0 })).toThrow();
    expect(() => mapEmbedHtml({ longitude: 0, latitude: NaN })).toThrow();
    expect(() => mapEmbedHtml({ longitude: Infinity, latitude: 0 })).toThrow();
  });
});
