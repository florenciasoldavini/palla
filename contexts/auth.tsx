import {
  getSupabaseErrorMessage,
  isSupabaseConfigured,
  supabase
} from "@/lib/supabase";
import { Sentry } from "@/lib/sentry";
import { sendWelcomeToPallaEmail } from "@/services/email.service";
import type { User } from "@/types/models/user";
import type { Session } from "@supabase/supabase-js";
import { createContext, useEffect, useRef, useState } from "react";

type EditableUserProfile = Pick<
  User,
  "avatar" | "first_name" | "last_name" | "phone_number"
>;
type AuthProfileMetadata = Record<string, unknown>;

interface AuthContextType {
  authError: string | null;
  createUser: (
    session: Session,
    profile?: Partial<User>
  ) => Promise<User | null>;
  isLoading: boolean;
  logOut: () => Promise<void>;
  session: Session | null;
  updateUserProfile: (
    profile: Partial<EditableUserProfile>
  ) => Promise<User | null>;
  user: User | null;
}

const defaultAuthError = isSupabaseConfigured
  ? null
  : "Supabase is not configured yet. Add your new project URL and publishable key to .env.local and restart Expo.";

export const AuthContext = createContext<AuthContextType>({
  authError: defaultAuthError,
  createUser: async () => null,
  isLoading: true,
  logOut: async () => {},
  session: null,
  updateUserProfile: async () => null,
  user: null
});

function getCleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getMetadataValue(
  metadataSources: AuthProfileMetadata[],
  keys: string[]
) {
  for (const metadata of metadataSources) {
    for (const key of keys) {
      const value = getCleanString(metadata[key]);

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function getNameParts(fullName: string | null) {
  if (!fullName) {
    return { firstName: null, lastName: null };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null
  };
}

function getEmailName(email: string) {
  return email.split("@")[0] || "User";
}

function getAuthMetadataSources(session: Session) {
  return [
    session.user.user_metadata,
    ...(session.user.identities ?? []).map(
      (identity) => identity.identity_data ?? {}
    )
  ] satisfies AuthProfileMetadata[];
}

const getFallbackProfile = (
  session: Session,
  profile?: Partial<User>
): Omit<
  User,
  "created_at" | "updated_at" | "deleted_at" | "welcome_email_sent_at"
> => {
  const email = (session.user.email ?? profile?.email ?? "")
    .trim()
    .toLowerCase();
  const emailName = getEmailName(email);
  const metadataSources = getAuthMetadataSources(session);
  const fullName =
    getMetadataValue(metadataSources, ["full_name", "name", "display_name"]) ??
    getMetadataValue(metadataSources, ["fullName", "displayName"]);
  const { firstName: fullNameFirstName, lastName: fullNameLastName } =
    getNameParts(fullName);

  return {
    avatar:
      getCleanString(profile?.avatar) ??
      getMetadataValue(metadataSources, ["avatar_url", "picture", "avatar"]) ??
      getMetadataValue(metadataSources, ["photo_url", "photoURL"]) ??
      null,
    email,
    id: session.user.id,
    first_name:
      getCleanString(profile?.first_name) ??
      getMetadataValue(metadataSources, ["first_name", "given_name"]) ??
      getMetadataValue(metadataSources, ["firstName", "givenName"]) ??
      fullNameFirstName ??
      emailName,
    last_name:
      getCleanString(profile?.last_name) ??
      getMetadataValue(metadataSources, ["last_name", "family_name"]) ??
      getMetadataValue(metadataSources, ["lastName", "familyName"]) ??
      fullNameLastName ??
      null,
    phone_number:
      getCleanString(profile?.phone_number) ??
      getMetadataValue(metadataSources, ["phone_number", "phone"]) ??
      getMetadataValue(metadataSources, ["phoneNumber"]) ??
      null,
    role: "user"
  };
};

function getAuthProfileBackfillPatch(existingUser: User, session: Session) {
  const authProfile = getFallbackProfile(session);
  const emailName = getEmailName(authProfile.email).toLowerCase();
  const patch: Partial<EditableUserProfile> = {};
  const existingFirstName = existingUser.first_name.trim().toLowerCase();
  const authFirstName = authProfile.first_name.trim();

  if (
    authFirstName &&
    authFirstName.toLowerCase() !== emailName &&
    (!existingFirstName || existingFirstName === emailName)
  ) {
    patch.first_name = authFirstName;
  }

  if (!existingUser.last_name && authProfile.last_name) {
    patch.last_name = authProfile.last_name;
  }

  if (!existingUser.avatar && authProfile.avatar) {
    patch.avatar = authProfile.avatar;
  }

  if (!existingUser.phone_number && authProfile.phone_number) {
    patch.phone_number = authProfile.phone_number;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authError, setAuthError] = useState<string | null>(defaultAuthError);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const welcomeEmailAttemptsRef = useRef<Set<string>>(new Set());

  const maybeSendWelcomeEmail = (nextUser: User) => {
    if (
      nextUser.welcome_email_sent_at ||
      welcomeEmailAttemptsRef.current.has(nextUser.id)
    ) {
      return;
    }

    welcomeEmailAttemptsRef.current.add(nextUser.id);

    void sendWelcomeToPallaEmail({ name: nextUser.first_name })
      .then((result) => {
        const welcomeEmailSentAt = result?.welcome_email_sent_at;

        if (!welcomeEmailSentAt) {
          return;
        }

        setUser((currentUser) =>
          currentUser?.id === nextUser.id
            ? {
                ...currentUser,
                welcome_email_sent_at: new Date(welcomeEmailSentAt)
              }
            : currentUser
        );
      })
      .catch((error) => {
        Sentry.captureException(error);
      });
  };

  const createUser = async (
    nextSession: Session,
    profile?: Partial<User>
  ): Promise<User | null> => {
    if (!supabase) {
      return null;
    }

    const payload = getFallbackProfile(nextSession, profile);
    const { data, error } = await supabase
      .from("users")
      .insert(payload)
      .select()
      .single();

    if (error) {
      const isDuplicate =
        (typeof error === "object" &&
          error &&
          "code" in error &&
          String(error.code) === "23505") ||
        getSupabaseErrorMessage(error).toLowerCase().includes("duplicate");

      if (isDuplicate) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("email", payload.email)
          .maybeSingle();

        if (existingUser) {
          const nextUser = existingUser as User;

          if (nextUser.id === payload.id) {
            setUser(nextUser);
            setAuthError(null);
            maybeSendWelcomeEmail(nextUser);
            return nextUser;
          }

          setAuthError(
            "This email is already linked to a different sign-in method. Use the method you signed up with first, then we can add account linking later."
          );
          return null;
        }
      }

      setAuthError(getSupabaseErrorMessage(error));
      return null;
    }

    const nextUser = data as User;
    setUser(nextUser);
    setAuthError(null);
    maybeSendWelcomeEmail(nextUser);
    return nextUser;
  };

  const updateUserProfile = async (
    profile: Partial<EditableUserProfile>
  ): Promise<User | null> => {
    if (!supabase || !session) {
      return null;
    }

    const payload = {
      avatar: profile.avatar?.trim() || null,
      first_name: profile.first_name?.trim() ?? user?.first_name ?? "",
      last_name: profile.last_name?.trim() || null,
      phone_number: profile.phone_number?.trim() || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", session.user.id)
      .select()
      .single();

    if (error) {
      setAuthError(getSupabaseErrorMessage(error));
      return null;
    }

    const nextUser = data as User;
    setUser(nextUser);
    setAuthError(null);

    return nextUser;
  };

  const hydrateUser = async (nextSession: Session | null) => {
    if (!supabase || !nextSession) {
      setSession(nextSession);
      setUser(null);
      return;
    }

    setSession(nextSession);

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", nextSession.user.id)
      .maybeSingle();

    if (error) {
      setAuthError(getSupabaseErrorMessage(error));
      setUser(null);
      return;
    }

    if (!data) {
      await createUser(nextSession);
      return;
    }

    const existingUser = data as User;
    const authProfileBackfillPatch = getAuthProfileBackfillPatch(
      existingUser,
      nextSession
    );

    if (authProfileBackfillPatch) {
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          ...authProfileBackfillPatch,
          updated_at: new Date().toISOString()
        })
        .eq("id", nextSession.user.id)
        .select()
        .single();

      if (!updateError && updatedUser) {
        const nextUser = updatedUser as User;
        setUser(nextUser);
        setAuthError(null);
        maybeSendWelcomeEmail(nextUser);
        return;
      }
    }

    setUser(existingUser);
    setAuthError(null);
    maybeSendWelcomeEmail(existingUser);
  };

  const logOut = async () => {
    if (!supabase) {
      setSession(null);
      setUser(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(getSupabaseErrorMessage(error));
      return;
    }

    setSession(null);
    setUser(null);
    setAuthError(null);
  };

  useEffect(() => {
    if (!session && !user) {
      Sentry.setUser(null);
      return;
    }

    Sentry.setUser({
      email: user?.email ?? session?.user.email,
      id: user?.id ?? session?.user.id,
      username:
        [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
        undefined
    });
    Sentry.setTag("auth_state", session ? "authenticated" : "anonymous");
    Sentry.setTag("user_role", user?.role ?? "unknown");
  }, [session, user]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (error) {
          setAuthError(getSupabaseErrorMessage(error));
          setSession(null);
          setUser(null);
          return;
        }

        await hydrateUser(data.session);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAuthError(getSupabaseErrorMessage(error));
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription }
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      void hydrateUser(nextSession).finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authError,
        createUser,
        isLoading,
        logOut,
        session,
        updateUserProfile,
        user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
