import { deliverWelcomeEmail, parseWelcomeName } from "./delivery.ts";
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

  let requestedName: string | undefined;
  try {
    requestedName = parseWelcomeName(await req.json());
  } catch {
    return jsonResponse(
      { error: "Provide a valid name of up to 80 characters." },
      { status: 400 }
    );
  }
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await adminSupabase.rpc(name, args);
    if (error) throw Error("Welcome email state unavailable");
    return data;
  };
  try {
    const result = await deliverWelcomeEmail({
      claim: () =>
        rpc("claim_welcome_email", {
          p_actor: authUser.id,
          p_name: (requestedName ?? getFirstName(authUser, {})).slice(0, 80)
        }),
      send: async (name) => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `welcome-to-palla-${authUser.id}`
          },
          body: JSON.stringify({
            from: emailFrom,
            to: authUser.email,
            subject: "Welcome to Palla",
            html: await renderWelcomeToPallaEmail({ appUrl, name }),
            ...(emailReplyTo ? { reply_to: emailReplyTo } : {})
          })
        });
        if (!response.ok) throw Error("Email provider unavailable");
        return response.json();
      },
      finish: (token) =>
        rpc("finish_welcome_email", { p_actor: authUser.id, p_token: token }),
      release: (token) =>
        rpc("release_welcome_email", { p_actor: authUser.id, p_token: token })
    });
    return jsonResponse(result);
  } catch {
    return jsonResponse(
      { error: "Welcome email could not be sent. Please try again shortly." },
      { status: 503 }
    );
  }
}

export default { fetch: handler };
