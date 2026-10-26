import { describe, expect, it, vi } from "vitest";
import {
  readInventoryAttributes,
  readInventoryPages
} from "./inventory-pagination";

describe("organizer inventory pagination", () => {
  it("loads beyond API caps, even when the server cap is smaller than the requested page", async () => {
    const records = Array.from({ length: 1250 }, (_, id) => ({ id }));
    const fetch = vi.fn(async (from: number) => ({
      data: records.slice(from, from + 75),
      error: null
    }));
    const result = await readInventoryPages(fetch);
    expect(result.data).toEqual(records);
    expect(fetch.mock.calls[1][0]).toBe(75);
  });
  it("does not return incomplete inventory when a later page fails", async () => {
    const error = Error("connection lost");
    await expect(
      readInventoryPages(async (from) =>
        from === 0 ? { data: [1], error: null } : { data: null, error }
      )
    ).rejects.toBe(error);
  });
  it("scopes attribute pages to batches of inventory IDs without dropping attributes", async () => {
    const ids = Array.from({ length: 205 }, (_, i) => String(i));
    const fetch = vi.fn(async (selected: string[], from: number) => ({
      data: selected
        .flatMap((id) => [id + ":a", id + ":b"])
        .slice(from, from + 60),
      error: null
    }));
    const result = await readInventoryAttributes(ids, fetch);
    expect(result.data).toHaveLength(410);
    expect(new Set(fetch.mock.calls.flatMap(([batch]) => batch)).size).toBe(
      205
    );
    expect(fetch.mock.calls.every(([batch]) => batch.length <= 100)).toBe(true);
    await readInventoryAttributes([], fetch);
  });
});
