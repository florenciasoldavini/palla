import { useContext, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/features/auth/auth-provider";
import { Screen, SkeletonBlock } from "@/components/atoms";
import { ProfileOverview } from "../components/profile-overview";

export default function ProfileScreen({
  mode = "player"
}: {
  mode?: "player" | "organizer";
}) {
  const router = useRouter();
  const { user, logOut } = useContext(AuthContext);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  if (!user)
    return (
      <Screen>
        <SkeletonBlock height={240} />
      </Screen>
    );
  return (
    <ProfileOverview
      user={user}
      mode={mode}
      onEdit={() =>
        router.push({ pathname: "/account/edit-profile", params: { mode } })
      }
      onMenu={(section) =>
        router.push(
          section === "security"
            ? "/account/security"
            : { pathname: "/account/[section]", params: { section } }
        )
      }
      onLogout={() =>
        Alert.alert(
          "Log out of Palla?",
          "You can sign in again whenever you’re ready.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Log out",
              style: "destructive",
              onPress: () => {
                setLoggingOut(true);
                setLogoutError(null);
                void logOut()
                  .catch(() =>
                    setLogoutError(
                      "Couldn’t log you out. Check your connection and try again."
                    )
                  )
                  .finally(() => setLoggingOut(false));
              }
            }
          ]
        )
      }
      loggingOut={loggingOut}
      logoutError={logoutError}
    />
  );
}
