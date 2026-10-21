/** Public OSM address lookup. Call once per saved address, never per keystroke. */
export async function geocodeAddress(address: string, signal?: AbortSignal) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", address);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "en");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel);
  if (signal?.aborted) cancel();
  const timer = setTimeout(cancel, 10_000);
  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error("Map location unavailable");
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
