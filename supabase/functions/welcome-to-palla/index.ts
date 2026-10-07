import { createClient } from "npm:@supabase/supabase-js@2.50.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { renderWelcomeToPallaEmail } from "../_shared/email/welcome-to-palla.tsx";

type WelcomeRequestBody = {
  name?: string;
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const emailFrom = Deno.env.get("EMAIL_FROM") ?? "Palla <onboarding@resend.dev>";
const emailReplyTo = Deno.env.get("EMAIL_REPLY_TO");
const appUrl =
  Deno.env.get("SITE_URL") ??
  Deno.env.get("EXPO_PUBLIC_SITE_URL") ??
  "https://palla.vercel.app";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type UserEmailState = {
  email: string;
  first_name: string;
  welcome_email_sent_at: string | null;
};

type AuthenticatedUser = {
  id: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    full_name?: string;
    name?: string;
  };
};

function getPublishableKey() {
  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");

  if (publishableKeys) {
    try {
      const keys = JSON.parse(publishableKeys) as Record<string, string>;
      return keys.default ?? Object.values(keys)[0] ?? null;
    } catch {
      return null;
    }
  }

  return Deno.env.get("SUPABASE_ANON_KEY") ?? null;
}

function getFirstNameFromEmail(email: string) {
  return email.split("@")[0]?.split(/[._-]/)[0] || "there";
}

function getFirstName(user: AuthenticatedUser, body: WelcomeRequestBody) {
  return (
    body.name?.trim() ||
    user.user_metadata?.first_name?.trim() ||
    user.user_metadata?.full_name?.trim().split(/\s+/)[0] ||
    user.user_metadata?.name?.trim().split(/\s+/)[0] ||
    (user.email ? getFirstNameFromEmail(user.email) : "there")
  );
}

async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  if (!resendApiKey) {
    return jsonResponse(
      { error: "RESEND_API_KEY is not configured for this function." },
      { status: 500 }
    );
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return jsonResponse(
      { error: "A signed-in user with an email address is required." },
      { status: 401 }
    );
  }

  const publishableKey = getPublishableKey();

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return jsonResponse(
      { error: "Supabase function environment is not configured." },
      { status: 500 }
    );
  }

  const authSupabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: authorization
      }
    }
  });
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const {
    data: { user },
    error: authError
  } = await authSupabase.auth.getUser();

  const authUser = user as AuthenticatedUser | null;

  if (authError || !authUser?.id || !authUser.email) {
    return jsonResponse(
      { error: "A signed-in user with an email address is required." },
      { status: 401 }
    );
  }

  const sentAt = new Date().toISOString();
  const { data: claimedUser, error: claimError } = await adminSupabase
    .from("users")
    .update({ welcome_email_sent_at: sentAt })
    .eq("id", authUser.id)
    .is("welcome_email_sent_at", null)
    .select("email, first_name, welcome_email_sent_at")
    .maybeSingle();

  const claimedEmailState = claimedUser as UserEmailState | null;

  if (claimError) {
    return jsonResponse(
      { error: "Could not reserve welcome email state." },
      { status: 500 }
    );
  }

  if (!claimedEmailState) {
    const { data: existingUser, error: existingUserError } = await adminSupabase
      .from("users")
      .select("email, first_name, welcome_email_sent_at")
      .eq("id", authUser.id)
      .maybeSingle();

    const existingEmailState = existingUser as UserEmailState | null;

    if (existingUserError) {
      return jsonResponse(
        { error: "Could not check welcome email state." },
        { status: 500 }
      );
    }

    if (!existingEmailState) {
      return jsonResponse(
        { error: "User profile was not found." },
        { status: 404 }
      );
    }

    if (existingEmailState.welcome_email_sent_at) {
      return jsonResponse({
        ok: true,
        skipped: true,
        welcome_email_sent_at: existingEmailState.welcome_email_sent_at
      });
    }

    return jsonResponse(
      { error: "Could not reserve welcome email state." },
      { status: 409 }
    );
  }

  let body: WelcomeRequestBody = {};

  try {
    body = (await req.json()) as WelcomeRequestBody;
  } catch {
    body = {};
  }

  const name =
    body.name?.trim() ||
    claimedEmailState.first_name ||
    getFirstName(authUser, body);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `welcome-to-palla-${authUser.id}`
    },
    body: JSON.stringify({
      from: emailFrom,
      to: claimedEmailState.email,
      subject: "Welcome to Palla",
      html: await renderWelcomeToPallaEmail({ appUrl, name }),
      ...(emailReplyTo ? { reply_to: emailReplyTo } : {})
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    await adminSupabase
      .from("users")
      .update({ welcome_email_sent_at: null })
      .eq("id", authUser.id)
      .eq("welcome_email_sent_at", sentAt);

    return jsonResponse(
      { error: "Resend could not send the welcome email.", details: result },
      { status: response.status }
    );
  }

  return jsonResponse({
    id: result.id,
    ok: true,
    skipped: false,
    welcome_email_sent_at: sentAt
  });
}

export default { fetch: handler };
