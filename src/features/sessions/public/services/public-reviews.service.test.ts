import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublicReviews } from "../repositories/public-reviews.repository";
import { loadPublicReviews } from "./public-reviews.service";
import {
  emptyPublicReviews,
  publicReviewsPreview
} from "../reviews-preview-fixture";
vi.mock("../repositories/public-reviews.repository", () => ({
  fetchPublicReviews: vi.fn()
}));
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.mocked(fetchPublicReviews).mockReset());
describe("public reviews", () => {
  it("rejects invalid identifiers without requesting data", async () => {
    expect(await loadPublicReviews("bad")).toBeNull();
    expect(fetchPublicReviews).not.toHaveBeenCalled();
  });
  it("passes the stable cursor and abort signal through", async () => {
    vi.mocked(fetchPublicReviews).mockResolvedValue(publicReviewsPreview);
    const cursor = { created_at: "2026-10-17T12:00:00Z", id };
    const signal = new AbortController().signal;
    expect(await loadPublicReviews(id, 2, cursor, signal)).toEqual(
      publicReviewsPreview
    );
    expect(fetchPublicReviews).toHaveBeenCalledWith(id, 2, cursor, signal);
  });
  it("accepts empty reviews and inaccessible sessions without inventing ratings", async () => {
    vi.mocked(fetchPublicReviews)
      .mockResolvedValueOnce(emptyPublicReviews)
      .mockResolvedValueOnce(null);
    expect((await loadPublicReviews(id))?.average).toBeNull();
    expect(await loadPublicReviews(id)).toBeNull();
  });
  it("rejects unbounded page sizes and malformed cursors", async () => {
    await expect(loadPublicReviews(id, 21)).rejects.toThrow();
    await expect(
      loadPublicReviews(id, 2, { id, created_at: "yesterday" })
    ).rejects.toThrow();
    expect(fetchPublicReviews).not.toHaveBeenCalled();
  });
  it("rejects contradictory rating summaries", async () => {
    vi.mocked(fetchPublicReviews).mockResolvedValue({
      ...emptyPublicReviews,
      average: 0
    });
    await expect(loadPublicReviews(id)).rejects.toThrow();
    vi.mocked(fetchPublicReviews).mockResolvedValue({
      ...publicReviewsPreview,
      total: 19
    });
    await expect(loadPublicReviews(id)).rejects.toThrow();
  });
});
