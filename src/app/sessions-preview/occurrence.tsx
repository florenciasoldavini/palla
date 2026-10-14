import { SessionOccurrenceDetail } from "@/features/sessions/components/session-occurrence-detail";
import type { PadelSession } from "@/features/sessions/domain";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
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
  waitlist_enabled: false,
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
  return (
    <SessionOccurrenceDetail
      preview
      session={sample}
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
