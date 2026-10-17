import { getSupabaseErrorMessage, supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export type SupportedOAuthProvider = "apple" | "google";

export interface AuthRedirectResult {
  session: Session | null;
  type: string | null;
}

function getConfiguredSiteUrl() {
  const configuredSiteUrl = process.env.EXPO_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  return null;
}

function getBrowserOrigin() {
  if (typeof window === "undefined" || !window.location.origin) {
    return null;
  }

  return window.location.origin.replace(/\/+$/, "");
}

function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function getNativeAuthRedirectUrl(
  path: "callback" | "reset-password",
  queryParams?: Record<string, string>
) {
  return Linking.createURL(path, {
    queryParams,
    scheme: isExpoGo() ? "exp" : "palla"
  });
}

function getCombinedSearchParams(url: URL) {
  const searchParams = new URLSearchParams(url.search);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  for (const [key, value] of hashParams.entries()) {
    if (!searchParams.has(key)) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

export function getAuthRedirectUrl(
  path: "callback" | "reset-password" = "callback",
  queryParams?: Record<string, string>
) {
  if (Platform.OS === "web") {
    const siteUrl = getBrowserOrigin() ?? getConfiguredSiteUrl();

    if (!siteUrl) {
      throw new Error(
        "Missing EXPO_PUBLIC_SITE_URL. Add it to your env vars before using hosted auth redirects."
      );
    }

    const searchParams = new URLSearchParams(queryParams);
    const search = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

    return `${siteUrl}/${path}${search}`;
  }

  return getNativeAuthRedirectUrl(path, queryParams);
}

export function getAuthParamsFromUrl(url: string) {
  return getCombinedSearchParams(new URL(url));
}

export function urlHasAuthPayload(url: string) {
  const params = getAuthParamsFromUrl(url);

  return (
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.has("code") ||
    params.has("error") ||
    params.has("error_description") ||
    params.has("type")
  );
}

// Expo Router may already have received the callback while a Linking hook still
// holds the launch URL. Only copy recognized auth parameters from that route.
export function resolveAuthCallbackUrl(
  linkingUrl: string | null,
  routeParams: Record<string, string | string[] | undefined>
): string | null {
  const route = new URL("palla://callback");
  for (const key of [
    "code",
    "access_token",
    "refresh_token",
    "type",
    "error",
    "error_description",
    "next"
  ]) {
    const value = routeParams[key];
    if (typeof value === "string") route.searchParams.set(key, value);
  }
  if (
    route.searchParams.has("code") ||
    (route.searchParams.has("access_token") &&
      route.searchParams.has("refresh_token"))
  )
    return route.toString();
  const candidate = getActiveAuthUrl(linkingUrl);
  if (candidate) {
    try {
      if (urlHasAuthPayload(candidate)) return candidate;
    } catch {
      /* Ignore malformed or unrelated launch links. */
    }
  }
  return urlHasAuthPayload(route.toString()) ? route.toString() : null;
}

export function getActiveAuthUrl(linkingUrl: string | null) {
  if (linkingUrl) {
    return linkingUrl;
  }

  if (typeof window !== "undefined") {
    return window.location.href;
  }

  return null;
}

const authExchanges = new Map<string, Promise<AuthRedirectResult>>();

export function completeAuthSessionFromUrl(
  url: string
): Promise<AuthRedirectResult> {
  const params = getAuthParamsFromUrl(url);
  const credential =
    params.get("code") ??
    (params.get("access_token") && params.get("refresh_token")
      ? `${params.get("access_token")}:${params.get("refresh_token")}`
      : null);
  if (!credential) return exchangeAuthSessionFromUrl(url);
  const existing = authExchanges.get(credential);
  if (existing) return existing;
  const exchange = exchangeAuthSessionFromUrl(url).finally(() =>
    authExchanges.delete(credential)
  );
  authExchanges.set(credential, exchange);
  return exchange;
}

async function exchangeAuthSessionFromUrl(
  url: string
): Promise<AuthRedirectResult> {
  if (!supabase) {
    throw new Error(getSupabaseErrorMessage("Supabase is not configured."));
  }

  const params = getAuthParamsFromUrl(url);
  const authType = params.get("type");
  const errorDescription =
    params.get("error_description") ?? params.get("error");
  const code = params.get("code");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    return { session: data.session, type: authType };
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      throw error;
    }

    return { session: data.session, type: authType };
  }

  return { session: null, type: authType };
}

export async function startOAuthSignIn(provider: SupportedOAuthProvider) {
  if (!supabase) {
    throw new Error(getSupabaseErrorMessage("Supabase is not configured."));
  }

  const redirectTo = getAuthRedirectUrl("callback");
  const providerLabel = provider === "google" ? "Google" : "Apple";

  if (Platform.OS === "web") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error(
      `${providerLabel} sign-in could not start because Supabase did not return an OAuth URL.`
    );
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  // Closing the provider sheet is a normal user choice, not an auth failure.
  if (result.type === "cancel" || result.type === "dismiss") {
    return null;
  }

  if (result.type !== "success" || !("url" in result) || !result.url) {
    throw new Error(
      `We couldn't sign you in with ${providerLabel}. Please try again.`
    );
  }

  return completeAuthSessionFromUrl(result.url);
}

export async function startOAuthIdentityLink(provider: SupportedOAuthProvider) {
  if (!supabase) {
    throw new Error(getSupabaseErrorMessage("Supabase is not configured."));
  }

  const redirectTo = getAuthRedirectUrl("callback", { next: "/profile" });
  const providerLabel = provider === "google" ? "Google" : "Apple";

  if (Platform.OS === "web") {
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo }
    });

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error(
      `${providerLabel} linking could not start because Supabase did not return an OAuth URL.`
    );
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  // Closing the provider sheet is a normal user choice, not an auth failure.
  if (result.type === "cancel" || result.type === "dismiss") {
    return null;
  }

  if (result.type !== "success" || !("url" in result) || !result.url) {
    throw new Error(`We couldn't connect ${providerLabel}. Please try again.`);
  }

  return completeAuthSessionFromUrl(result.url);
}

export async function sendPasswordResetEmail(email: string) {
  if (!supabase) {
    throw new Error(getSupabaseErrorMessage("Supabase is not configured."));
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl("reset-password")
  });

  if (error) {
    throw error;
  }
}

export async function resendSignUpConfirmationEmail(email: string) {
  if (!supabase) {
    throw new Error(getSupabaseErrorMessage("Supabase is not configured."));
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl("callback")
    }
  });

  if (error) {
    throw error;
  }
}

export async function updatePassword(password: string) {
  if (!supabase) {
    throw new Error(getSupabaseErrorMessage("Supabase is not configured."));
  }

  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }

  return data;
}

function getSafePostAuthRedirectPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}

export function getPostAuthRedirectPath(
  authType: string | null,
  nextPath: string | null = null
) {
  if (authType === "recovery") {
    return "/reset-password";
  }

  return getSafePostAuthRedirectPath(nextPath);
}

export function clearWebAuthUrlArtifacts() {
  // Expo can provide window.location on native without browser history APIs.
  if (Platform.OS !== "web") return;
  const origin = getBrowserOrigin();

  if (typeof window === "undefined" || !origin) {
    return;
  }

  const cleanUrl = `${origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);
}
