import { WaitlistPreview } from "@/features/registrations/components/waitlist-preview";
import { AttendanceSections } from "@/features/registrations/components/organizer-attendance";
import type { Attendee } from "@/features/registrations/domain";
import { useEffect, useState } from "react";
import { AppButton } from "@/components/atoms";
import { Alert, View } from "react-native";
import { SessionOccurrenceDetail } from "@/features/sessions/components/session-occurrence-detail";
import type { PadelSession } from "@/features/sessions/domain";
import { useRouter } from "expo-router";
const sample: PadelSession = {
  id: "11111111-1111-4111-8111-111111111111",
  organizer_id: "11111111-1111-4111-8111-111111111112",
  series_id: "11111111-1111-4111-8111-111111111113",
  venue_id: "11111111-1111-4111-8111-111111111114",
  occurrence_date: "2026-10-24",
  title: "Main Court · Sunset AC",
  description:
    "Friendly games for 6ta and 7ma players. Bring your racket and arrive 10 minutes early.",
  court_label: "Court 2",
  capacity: 4,
  allowed_categories: [6, 7],
  strict_category_enforcement: false,
  participant_gender_policy: "all",
  visibility: "private",
  waitlist_enabled: true,
  waitlist_promotion_mode: "automatic",
  waitlist_capacity: null,
  registration_opens_at: null,
  price_minor: 1200000,
  currency: "ARS",
  payment_instructions: null,
  starts_at: "2026-10-24T18:00:00-03:00",
  ends_at: "2026-10-24T19:30:00-03:00",
  registration_closes_at: "2026-10-24T16:00:00-03:00",
  cancellation_deadline_at: "2026-10-23T18:00:00-03:00",
  status: "published",
  cancelled_at: null,
  cancellation_reason: null,
  created_at: "2026-10-14T12:00:00Z",
  updated_at: "2026-10-14T12:00:00Z"
};
export default function OccurrencePreview() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees);
  const [busyId, setBusyId] = useState<string>();
  const [mode, setMode] = useState<
    "normal" | "empty" | "loading" | "error" | "cancelled"
  >("normal");
  useEffect(() => {
    if (mode !== "loading") return;
    const timer = setTimeout(() => setMode("normal"), 4000);
    return () => clearTimeout(timer);
  }, [mode]);
  return (
    <SessionOccurrenceDetail
      registeredCount={mode === "empty" ? 0 : attendees.length}
      occupancyLoading={mode === "loading"}
      occupancyError={mode === "error"}
      preview
      waitlist={
        <WaitlistPreview
          sessionId={sample.id}
          attendees={attendees}
          initialRoster={initialAttendees}
          onRosterChange={setAttendees}
          published={mode !== "cancelled"}
        />
      }
      attendance={(between) => (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(
              ["normal", "empty", "loading", "error", "cancelled"] as const
            ).map((state) => (
              <AppButton
                key={state}
                size="sm"
                fullWidth={false}
                variant="ghost"
                accessibilityLabel={`Preview attendance ${state}`}
                onPress={() => setMode(state)}
              >
                {state}
              </AppButton>
            ))}
          </View>
          <AttendanceSections
            capacity={sample.capacity}
            previewPaymentLabel="Paid $12,000"
            between={between}
            attendees={mode === "empty" ? [] : attendees}
            loading={mode === "loading"}
            error={
              mode === "error"
                ? "We couldn’t save this arrival. Reload attendees and try again."
                : null
            }
            disabled={mode === "cancelled"}
            busyId={busyId}
            timeZone="America/Argentina/Buenos_Aires"
            onRetry={() => setMode("normal")}
            onChange={async (row, arrived) => {
              setBusyId(row.id);
              await new Promise((resolve) => setTimeout(resolve, 600));
              setAttendees((rows) =>
                rows.map((value) =>
                  value.id === row.id
                    ? {
                        ...value,
                        checked_in_at: arrived
                          ? new Date().toISOString()
                          : null,
                        checked_in_by: arrived ? sample.organizer_id : null,
                        updated_at: new Date().toISOString()
                      }
                    : value
                )
              );
              setBusyId(undefined);
            }}
          />
        </>
      )}
      session={{
        ...sample,
        status: mode === "cancelled" ? "cancelled" : sample.status
      }}
      venue={{
        id: sample.venue_id,
        name: "Sunset Athletic Club",
        address: "Av. Córdoba 1234, Buenos Aires",
        arrival_instructions: null,
        google_place_id: null,
        created_by: sample.organizer_id,
        is_active: true,
        created_at: sample.created_at,
        updated_at: sample.updated_at
      }}
      weekly
      nextStart="2026-10-31T18:00:00-03:00"
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/sessions-preview")
      }
      onEdit={() =>
        Alert.alert(
          "Design preview",
          "Editing is available from a saved organizer session."
        )
      }
      onCancel={() =>
        Alert.alert(
          "Design preview",
          "No saved session is affected. Cancellation is available from a saved organizer session."
        )
      }
    />
  );
}

const initialAttendees: Attendee[] = [
  ["Alex", "Rivera", 6],
  ["Carlos", "M.", 7],
  ["Elena", "G.", 6]
].map(([first, last, category], index) => ({
  id: `22222222-2222-4222-8222-22222222222${index}`,
  session_id: sample.id,
  player_id: `33333333-3333-4333-8333-33333333333${index}`,
  status: "confirmed",
  joined_at: sample.created_at,
  waitlist_sequence: null,
  confirmed_at: sample.created_at,
  checked_in_at: null,
  checked_in_by: null,
  cancelled_at: null,
  cancelled_by: null,
  cancellation_reason: null,
  created_at: sample.created_at,
  updated_at: sample.updated_at,
  player: {
    first_name: String(first),
    last_name: String(last),
    playing_category: Number(category),
    avatar_url: null
  }
}));
