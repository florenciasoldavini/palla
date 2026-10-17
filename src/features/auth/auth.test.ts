import {
  clearWebAuthUrlArtifacts,
  completeAuthSessionFromUrl,
  resolveAuthCallbackUrl,
  startOAuthIdentityLink,
  startOAuthSignIn
} from "./auth";
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
  vi.unstubAllGlobals();
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

describe("native callback handoff", () => {
  it("never accesses browser history when native Expo supplies window.location", () => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:8081", pathname: "/callback" }
    });
    expect(() => clearWebAuthUrlArtifacts()).not.toThrow();
  });
  it("waits when no link has arrived instead of treating launch as a failed callback", () => {
    expect(resolveAuthCallbackUrl(null, {})).toBeNull();
    expect(
      resolveAuthCallbackUrl("exp://localhost:8081/--/sign-in", {})
    ).toBeNull();
    expect(resolveAuthCallbackUrl("not a URL", {})).toBeNull();
  });
  it("uses router credentials even when Linking still reports the launch URL", () => {
    const url = resolveAuthCallbackUrl("exp://localhost:8081/--/sign-in", {
      code: "router-code",
      next: "/profile",
      unrelated: "ignored"
    });
    expect(new URL(url!).searchParams.get("code")).toBe("router-code");
    expect(new URL(url!).searchParams.has("unrelated")).toBe(false);
  });
  it("keeps token fragments from the native callback", () => {
    const url =
      "exp://localhost:8081/--/callback#access_token=test-access&refresh_token=test-refresh";
    expect(resolveAuthCallbackUrl(url, {})).toBe(url);
    expect(resolveAuthCallbackUrl(url, { type: "signup" })).toBe(url);
  });
  it("only exchanges a code once when the browser and callback screen finish together", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: "test-user" } } },
      error: null
    });
    await Promise.all([
      completeAuthSessionFromUrl("palla://callback?code=shared-code"),
      completeAuthSessionFromUrl(
        "exp://localhost:8081/--/callback?code=shared-code"
      )
    ]);
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
});
