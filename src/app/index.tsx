import { AuthContext } from "@/features/auth/auth-provider";
import { getUserHomePath } from "@/features/onboarding/navigation";
import { Redirect } from "expo-router";
import { useContext } from "react";

export default function AccountEntry() {
  const { session, user } = useContext(AuthContext);
  if (!session) return <Redirect href="/sign-in" />;
  if (!user?.onboarding_completed_at) return <Redirect href="/onboarding" />;
  return <Redirect href={getUserHomePath(user)} />;
}
