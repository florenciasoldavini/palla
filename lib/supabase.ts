import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock
      }
    })
  : null;

if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

function getSupabaseRawErrorMessage(error: unknown) {
  return typeof error === "object" && error && "message" in error
    ? String(error.message)
    : typeof error === "string"
      ? error
      : "Unknown Supabase error.";
}

function getSupabaseRawErrorCode(error: unknown) {
  if (typeof error !== "object" || !error || !("code" in error)) {
    return null;
  }

  return String(error.code);
}

function getSupabaseRawErrorStatus(error: unknown) {
  if (typeof error !== "object" || !error || !("status" in error)) {
    return null;
  }

  return Number(error.status);
}

export function isSupabaseEmailRateLimitError(error: unknown) {
  const code = getSupabaseRawErrorCode(error);
  const message = getSupabaseRawErrorMessage(error).toLowerCase();
  const status = getSupabaseRawErrorStatus(error);

  return (
    status === 429 ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    message.includes("email rate limit exceeded") ||
    message.includes("rate limit") ||
    message.includes("only request this after") ||
    message.includes("security purposes")
  );
}

export function isSupabaseEmailSendQuotaError(error: unknown) {
  const code = getSupabaseRawErrorCode(error);
  const message = getSupabaseRawErrorMessage(error).toLowerCase();

  return (
    code === "over_email_send_rate_limit" ||
    message.includes("email rate limit exceeded")
  );
}

export function isSupabaseEmailCooldownError(error: unknown) {
  const code = getSupabaseRawErrorCode(error);
  const message = getSupabaseRawErrorMessage(error).toLowerCase();
  const status = getSupabaseRawErrorStatus(error);

  return (
    !isSupabaseEmailSendQuotaError(error) &&
    (status === 429 ||
      code === "over_request_rate_limit" ||
      message.includes("rate limit") ||
      message.includes("only request this after") ||
      message.includes("security purposes"))
  );
}

export function isSupabaseEmailNotConfirmedError(error: unknown) {
  const code = getSupabaseRawErrorCode(error);
  const message = getSupabaseRawErrorMessage(error).toLowerCase();

  return (
    code === "email_not_confirmed" || message.includes("email not confirmed")
  );
}

export function getSupabaseErrorMessage(error: unknown) {
  if (!isSupabaseConfigured) {
    return "Supabase is not configured yet. Add your new project URL and publishable key to .env.local and restart Expo.";
  }

  const message = getSupabaseRawErrorMessage(error);

  if (message.toLowerCase().includes("fetch")) {
    return "Supabase is currently unreachable. If your old project was paused, create the new project, update the Expo env vars, and restart the app.";
  }

  if (isSupabaseEmailSendQuotaError(error)) {
    return "Supabase is temporarily limiting verification emails for this project. Try again later, or configure a custom SMTP provider before production.";
  }

  if (isSupabaseEmailCooldownError(error)) {
    return "Wait about a minute, then resend the verification link.";
  }

  return message;
}
