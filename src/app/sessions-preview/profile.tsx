import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert } from "react-native";
import { ProfileOverview } from "@/features/profile/components/profile-overview";
import type { User } from "@/types/models/user";
const id = "95400000-0000-4000-8000-000000000001";
const user: User = {
  id,
  first_name: "Elena",
  last_name: "García",
  avatar: null,
  dominant_hand: "right",
  preferred_court_side: "left",
  bio: "Casual games, good rallies, and meeting new padel friends.",
  email: "qa@example.com",
  phone_number: null,
  playing_category: 7,
  category_status: "known",
  preferred_mode: "player",
  organizer_status: "active",
  onboarding_completed_at: new Date("2026-10-16T12:00:00Z"),
  role: "user",
  welcome_email_sent_at: null,
  created_at: new Date("2026-10-16T12:00:00Z"),
  updated_at: null,
  deleted_at: null
};
export default function ProfilePreview() {
  const { mode, recognition } = useLocalSearchParams<{
    mode?: string;
    recognition?: string;
  }>();
  const router = useRouter();
  return (
    <ProfileOverview
      user={user}
      mode={mode === "organizer" ? "organizer" : "player"}
      preview
      hostMilestone={recognition === "superhost" ? "superhost" : "verified"}
      onEdit={() =>
        Alert.alert(
          "Profile preview",
          "Editing is available from your real Profile tab. This preview makes no account changes."
        )
      }
      onMenu={(section) =>
        section === "security"
          ? Alert.alert(
              "Account & security",
              "Open this from your real Profile tab to manage sign-in settings."
            )
          : router.push({ pathname: "/account/[section]", params: { section } })
      }
      onLogout={() =>
        Alert.alert(
          "Log out of Palla?",
          "Preview only. Your account will stay signed in.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Log out", style: "destructive" }
          ]
        )
      }
    />
  );
}
