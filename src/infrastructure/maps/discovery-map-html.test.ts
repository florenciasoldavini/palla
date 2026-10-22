import { expect, it } from "vitest";
import { discoveryMapHtml } from "./discovery-map-html";
it("keeps venue names as data, including a malicious script terminator", () => {
  const html = discoveryMapHtml([
    {
      id: "df110000-0000-4000-8000-000000000001",
      name: '</script><script>alert("injected")</script>',
      longitude: -58.4,
      latitude: -34.6,
      count: 2
    }
  ]);
  expect(html).not.toContain('</script><script>alert("injected")');
  expect(html).toContain("\\u003c/script>");
  expect(html).toContain("el.textContent=String(p.count)");
});
it("omits non-finite and out-of-range coordinates instead of embedding them", () => {
  const html = discoveryMapHtml([
    {
      id: "bad-location",
      name: "Broken address",
      longitude: Infinity,
      latitude: 100,
      count: 1
    }
  ]);
  expect(html).not.toContain('"bad-location"');
  expect(html).not.toContain('"Broken address"');
});
