import { expect, it } from "vitest";
import {
  discoveryCursorSchema,
  discoveryPageSchema,
  mergeDiscoveryPages
} from "./pagination";
import type { DiscoverySession } from "./domain";
it("accepts precise scoped cursors with nullable distance and rejects malformed boundaries", () => {
  const cursor = {
    scope: "a".repeat(32),
    id: "df300000-0000-4000-8000-000000000001",
    starts_at: "2026-10-25T12:00:00.123456+00:00",
    price_minor: 0,
    distance_m: null
  };
  expect(discoveryCursorSchema.parse(cursor)).toEqual(cursor);
  expect(
    discoveryCursorSchema.safeParse({ ...cursor, distance_m: Infinity }).success
  ).toBe(false);
  expect(
    discoveryCursorSchema.safeParse({ ...cursor, id: "broken" }).success
  ).toBe(false);
  expect(
    discoveryPageSchema.safeParse({
      sessions: [],
      has_more: true,
      next_cursor: cursor
    }).success
  ).toBe(false);
  expect(
    discoveryPageSchema.safeParse({
      sessions: [],
      has_more: false,
      next_cursor: null
    }).success
  ).toBe(true);
});
it("merges every page in server order without duplicate session cards", () => {
  const a = { id: "a" } as DiscoverySession,
    b = { id: "b" } as DiscoverySession,
    c = { id: "c" } as DiscoverySession;
  expect(
    mergeDiscoveryPages([{ sessions: [a, b] }, { sessions: [b, c] }])
  ).toEqual([a, b, c]);
  expect(mergeDiscoveryPages([])).toEqual([]);
});
