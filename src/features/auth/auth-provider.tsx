import {
  getSupabaseErrorMessage,
  isSupabaseConfigured,
  supabase
} from "@/lib/supabase";
import { Sentry } from "@/lib/sentry";
import {
  fetchAuthProfile,
  persistUserProfile,
  type EditableUserProfile
} from "@/features/auth/repositories/profile.repository";
import type { User } from "@/types/models/user";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useEffect, useState } from "react";

interface AuthContextType {
  authError: string | null;
  isLoading: boolean;
  logOut: () => Promise<void>;
  session: Session | null;
  updateUserProfile: (
    profile: Partial<EditableUserProfile>
  ) => Promise<User | null>;
  refreshProfile: () => Promise<User | null>;
  user: User | null;
}
const defaultAuthError = isSupabaseConfigured
  ? null
  : "Account access is unavailable. Please try again later.";
export const AuthContext = createContext<AuthContextType>({
  authError: defaultAuthError,
  isLoading: true,
  logOut: async () => {},
  session: null,
  updateUserProfile: async () => null,
  refreshProfile: async () => null,
  user: null
});
export const authProfileKey = (id: string | undefined) =>
  ["auth-profile", id] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(defaultAuthError);
  const profile = useQuery({
    queryKey: authProfileKey(session?.user.id),
    queryFn: () => fetchAuthProfile(session!),
    enabled: Boolean(session),
    retry: 1,
    staleTime: 60_000
  });
  const user = session ? (profile.data ?? null) : null;

  useEffect(() => {
    if (!supabase) {
      setInitializing(false);
      return;
    }
    const db = supabase;
    let mounted = true;
    let authEventReceived = false;
    const {
      data: { subscription }
    } = db.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      if (mounted) {
        setSession(nextSession);
        setAuthError(null);
        setInitializing(false);
      }
    });
    void db.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted || authEventReceived) return;
        if (error) setAuthError(getSupabaseErrorMessage(error));
        setSession(data.session);
        setInitializing(false);
      })
      .catch((error) => {
        if (mounted) {
          setAuthError(getSupabaseErrorMessage(error));
          setInitializing(false);
        }
      });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    Sentry.setUser(
      session ? { id: session.user.id, email: session.user.email } : null
    );
  }, [session]);

  const refreshProfile = async () => {
    if (!session) return null;
    const result = await profile.refetch();
    if (result.error) throw result.error;
    return result.data ?? null;
  };
  const updateUserProfile = async (input: Partial<EditableUserProfile>) => {
    if (!session) return null;
    try {
      await persistUserProfile(session.user.id, input);
      setAuthError(null);
      return await refreshProfile();
    } catch (error) {
      setAuthError(getSupabaseErrorMessage(error));
      throw error;
    }
  };
  const logOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(getSupabaseErrorMessage(error));
        throw error;
      }
    }
    setSession(null);
    setAuthError(null);
    queryClient.clear();
  };
  return (
    <AuthContext.Provider
      value={{
        authError: profile.error
          ? getSupabaseErrorMessage(profile.error)
          : authError,
        isLoading: initializing || Boolean(session && profile.isPending),
        logOut,
        session,
        updateUserProfile,
        refreshProfile,
        user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
