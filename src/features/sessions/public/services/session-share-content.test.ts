import { describe, expect, it } from "vitest";
import { sessionShareContent } from "./session-share-content";
const session = {
  title: "Friday padel",
  description: "  Good rallies.\n New friends.  ",
  url: "https://palla-pink.vercel.app/session?id=test"
};
describe("native session sharing", () => {
  it("shares title, normalized description and a separate iOS URL", () => {
    expect(sessionShareContent("ios", session)).toEqual({
      title: session.title,
      message: "Friday padel\nGood rallies. New friends.",
      url: session.url
    });
  });
  it("includes the link in Android text so receiving apps keep it", () => {
    expect(
      sessionShareContent("android", { ...session, description: null })
    ).toEqual({
      title: session.title,
      message: `Friday padel\n${session.url}`
    });
  });
});
