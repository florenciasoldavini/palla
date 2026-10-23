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
  expect(html).toContain("el.textContent=String(g.count)");
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

// Execute the actual embedded bridge with a map stub: events, timers and camera
// updates are verified without depending on network tiles or a browser renderer.
import { runInNewContext } from "node:vm";
import { afterEach, vi } from "vitest";
function runtime() {
  const elements: {
    onclick?: (event: { stopPropagation: () => void }) => void;
    textContent?: string;
    attributes: Record<string, string>;
  }[] = [];
  const messages: { type: string; data?: unknown }[] = [];
  const handlers: Record<string, (event?: unknown) => void> = {};
  const once: Record<string, () => void> = {};
  const camera = { fit: vi.fn(), ease: vi.fn(), padding: vi.fn() };
  const map = {
    setPadding: camera.padding,
    fitBounds: camera.fit,
    easeTo: camera.ease,
    once: (name: string, fn: () => void) => {
      once[name] = fn;
    },
    on: (name: string, fn: (e?: unknown) => void) => {
      handlers[name] = fn;
    },
    getZoom: () => 12,
    project: (coords: number[]) => ({
      x: coords[0] * 10000,
      y: coords[1] * 10000
    }),
    unproject: (pixel: number[]) => ({
      toArray: () => pixel.map((n) => n / 10000)
    }),
    getBounds: () => ({
      getWest: () => -58.5,
      getEast: () => -58.3,
      getSouth: () => -34.7,
      getNorth: () => -34.5
    })
  };
  const window: Record<string, unknown> = {
    innerHeight: 800,
    addEventListener: () => {},
    ReactNativeWebView: {
      postMessage: (value: string) => messages.push(JSON.parse(value))
    }
  };
  const Marker = class {
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {}
  };
  const html = discoveryMapHtml([], 0);
  const script = html.slice(
    html.lastIndexOf("<script>") + 8,
    html.lastIndexOf("</script>")
  );
  const context = {
    report: (type: string, data?: unknown) => messages.push({ type, data }),
    window,
    document: {
      createElement: () => {
        const element = {
          attributes: {} as Record<string, string>,
          classList: { toggle: () => {} },
          setAttribute(name: string, value: string) {
            this.attributes[name] = value;
          }
        };
        elements.push(element);
        return element;
      }
    },
    maplibregl: {
      Map: class {
        constructor() {
          return map;
        }
      },
      Marker
    },
    setTimeout,
    clearTimeout
  };
  runInNewContext(script, context);
  return {
    elements,
    messages,
    handlers,
    once,
    camera,
    window: window as unknown as {
      updatePoints: (p: unknown[]) => void;
      selectPoint: (id: string | null, bottom: number, top: number) => void;
    }
  };
}
afterEach(() => vi.useRealTimers());
it("reports initial bounds and debounces user camera moves, replacing a pending search", () => {
  vi.useFakeTimers();
  const r = runtime();
  r.once.idle();
  expect(r.messages.map((m) => m.type)).toEqual(["loaded", "move"]);
  r.messages.length = 0;
  r.handlers.movestart({ originalEvent: {} });
  r.handlers.moveend();
  vi.advanceTimersByTime(300);
  r.handlers.movestart({ originalEvent: {} });
  r.handlers.moveend();
  vi.advanceTimersByTime(499);
  expect(r.messages).toEqual([]);
  vi.advanceTimersByTime(1);
  expect(r.messages).toHaveLength(1);
  expect(r.messages[0].type).toBe("move");
  const area = r.messages[0].data as {
    west: number;
    east: number;
    south: number;
    north: number;
  };
  expect(area.west).toBeCloseTo(-58.5);
  expect(area.east).toBeCloseTo(-58.3);
  expect(area.south).toBe(-34.7);
  expect(area.north).toBe(-34.5);
});
it("updates markers without fitting the camera and ignores selection-driven camera movement", () => {
  vi.useFakeTimers();
  const r = runtime();
  r.once.idle();
  r.messages.length = 0;
  const point = {
    id: "club",
    name: "Club",
    count: 1,
    longitude: -58.4,
    latitude: -34.6
  };
  r.window.updatePoints([point]);
  r.window.updatePoints([]);
  r.window.updatePoints([point]);
  expect(r.camera.fit).not.toHaveBeenCalled();
  expect(r.camera.ease).not.toHaveBeenCalled();
  r.window.selectPoint("club", 180, 20);
  r.handlers.movestart({});
  r.handlers.moveend();
  vi.advanceTimersByTime(1000);
  expect(r.messages).toEqual([]);
  expect(r.camera.ease).toHaveBeenCalledTimes(1);
  r.window.selectPoint("club", 200, 20);
  expect(r.camera.ease).toHaveBeenCalledTimes(1);
});

it("cluster expansion zooms in and searches its new viewport without selecting a session", () => {
  vi.useFakeTimers();
  const r = runtime();
  r.once.idle();
  r.messages.length = 0;
  r.window.updatePoints([
    { id: "a", name: "A", count: 2, longitude: 0, latitude: 0 },
    { id: "b", name: "B", count: 3, longitude: 0.001, latitude: 0 }
  ]);
  const cluster = r.elements.at(-1)!;
  expect(cluster.textContent).toBe("5");
  expect(cluster.attributes["aria-label"]).toBe(
    "5 sessions at 2 venues. Zoom in"
  );
  cluster.onclick!({ stopPropagation: () => {} });
  expect(r.camera.ease).toHaveBeenCalledWith({
    center: [0.0005, 0],
    zoom: 14,
    duration: 350
  });
  r.handlers.movestart({});
  r.handlers.moveend();
  vi.advanceTimersByTime(500);
  expect(r.messages.map((m) => m.type)).toEqual(["move"]);
});
