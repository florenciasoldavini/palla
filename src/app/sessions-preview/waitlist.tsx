import { AppButton, AppHeading, AppText, Screen } from "@/components/atoms";
import { WaitlistPreview } from "@/features/registrations/components/waitlist-preview";
import type { Attendee } from "@/features/registrations/domain";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
const initial: Attendee[] = ["Alex", "Carlos", "Elena"].map((name, index) => ({
  id: `22222222-2222-4222-8222-22222222222${index}`,
  session_id: "11111111-1111-4111-8111-111111111111",
  player_id: `33333333-3333-4333-8333-33333333333${index}`,
  status: "confirmed",
  joined_at: "2026-10-14T12:00:00Z",
  waitlist_sequence: null,
  confirmed_at: "2026-10-14T12:00:00Z",
  checked_in_at: null,
  checked_in_by: null,
  cancelled_at: null,
  cancelled_by: null,
  cancellation_reason: null,
  created_at: "2026-10-14T12:00:00Z",
  updated_at: "2026-10-14T12:00:00Z",
  player: {
    first_name: name,
    last_name: null,
    playing_category: 6,
    avatar_url: null
  }
}));
export default function WaitlistNativePreview() {
  const [attendees, setAttendees] = useState(initial);
  const router = useRouter();
  return (
    <Screen>
      <View style={{ gap: 24 }}>
        <AppButton
          variant="ghost"
          onPress={() => router.replace("/sessions-preview/occurrence")}
        >
          Back to session detail
        </AppButton>
        <AppHeading variant="section">Waitlist preview</AppHeading>
        <AppText variant="caption" tone="subtle">
          Development only · Simulated saves
        </AppText>
        <WaitlistPreview
          sessionId={initial[0].session_id}
          attendees={attendees}
          initialRoster={initial}
          onRosterChange={setAttendees}
          published
        />
        <AppText accessibilityLiveRegion="polite">
          {attendees.length} confirmed players
        </AppText>
      </View>
    </Screen>
  );
}
