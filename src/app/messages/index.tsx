import { AuthContext } from "@/features/auth/auth-provider";
import { Redirect } from "expo-router";
import { useContext } from "react";
export default function MessagesEntry() {
  const { user } = useContext(AuthContext);
  return (
    <Redirect
      href={
        user?.preferred_mode === "organizer" &&
        user.organizer_status === "active"
          ? "/(organizer)/organizer-messages"
          : "/(player)/player-messages"
      }
    />
  );
}
