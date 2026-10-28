import { useContext, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/features/auth/auth-provider";
import { Screen, SkeletonBlock, useAppToast } from "@/components/atoms";
import { ProfileOverview } from "../components/profile-overview";

export default function ProfileScreen({
  mode = "player"
}: {
  mode?: "player" | "organizer";
}) {
  const router = useRouter();
  const toast = useAppToast();
  const { user, logOut } = useContext(AuthContext);
  const [loggingOut, setLoggingOut] = useState(false);
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
          section === "language"
            ? "/account/language"
            : section === "notifications"
              ? { pathname: "/account/notifications", params: { mode } }
              : section === "security"
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
                void logOut()
                  .catch(() =>
                    toast.show({
                      title: "Couldn’t log out",
                      description: "Check your connection and try again.",
                      tone: "error"
                    })
                  )
                  .finally(() => setLoggingOut(false));
              }
            }
          ]
        )
      }
      loggingOut={loggingOut}
    />
  );
}
