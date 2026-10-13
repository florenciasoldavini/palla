import { startOAuthIdentityLink, startOAuthSignIn } from "./auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openAuthSession: vi.fn(),
  signInWithOAuth: vi.fn(),
  linkIdentity: vi.fn(),
  exchangeCodeForSession: vi.fn()
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseErrorMessage: String,
  supabase: {
    auth: {
      signInWithOAuth: mocks.signInWithOAuth,
      linkIdentity: mocks.linkIdentity,
      exchangeCodeForSession: mocks.exchangeCodeForSession
    }
  }
}));
vi.mock("expo-constants", () => ({
  default: { executionEnvironment: "storeClient" },
  ExecutionEnvironment: { StoreClient: "storeClient" }
}));
vi.mock("expo-linking", () => ({
  createURL: () => "exp://localhost/callback"
}));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: mocks.openAuthSession
}));

beforeEach(() => {
  vi.resetAllMocks();
  const response = {
    data: { url: "https://accounts.google.com" },
    error: null
  };
  mocks.signInWithOAuth.mockResolvedValue(response);
  mocks.linkIdentity.mockResolvedValue(response);
});

describe("native OAuth sheet results", () => {
  for (const start of [startOAuthSignIn, startOAuthIdentityLink]) {
    it.each(["cancel", "dismiss"])(
      `${start.name}: %s returns quietly without exchanging credentials`,
      async (type) => {
        mocks.openAuthSession.mockResolvedValue({ type });
        await expect(start("google")).resolves.toBeNull();
        expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
      }
    );
  }

  it("keeps a genuine incomplete callback as a failure", async () => {
    mocks.openAuthSession.mockResolvedValue({ type: "success" });
    await expect(startOAuthSignIn("google")).rejects.toThrow(
      "We couldn't sign you in with Google. Please try again."
    );
  });

  it("still exchanges a successful callback", async () => {
    mocks.openAuthSession.mockResolvedValue({
      type: "success",
      url: "palla://callback?code=test-code"
    });
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: "test-user" } } },
      error: null
    });
    await expect(startOAuthSignIn("google")).resolves.toMatchObject({
      session: { user: { id: "test-user" } }
    });
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
  });
});
