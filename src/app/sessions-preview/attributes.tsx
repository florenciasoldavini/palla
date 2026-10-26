import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";
import { AppButton, AppHeading, AppText, Screen } from "@/components/atoms";
import { SessionForm } from "@/features/sessions/components/session-form";
import {
  initialSessionForm,
  type SessionFormValues
} from "@/features/sessions/validation/session-form";
import { defaultSessionSettings } from "@/features/sessions/validation/session-settings";
import { AttributeChips } from "@/features/attributes/components/attribute-chips";
import { PublicSessionView } from "@/features/sessions/public/components/public-session-view";
import { publicSessionPreview } from "@/features/sessions/public/preview-fixture";
import { emptyPublicReviews } from "@/features/sessions/public/reviews-preview-fixture";
import type { Venue } from "@/features/venues/domain";

const venue: Venue = {
  id: "bf100000-0000-4000-8000-000000000001",
  created_by: "bf000000-0000-4000-8000-000000000001",
  name: "Club Padel Palermo",
  address: "Palermo, Buenos Aires",
  google_place_id: null,
  arrival_instructions: null,
  is_active: true,
  created_at: "2026-10-20T12:00:00Z",
  updated_at: "2026-10-20T12:00:00Z",
  attributes: ["free_parking", "showers"]
};
export default function AttributesPreview() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  return (
    <AttributesPreviewContent
      key={state ?? "default"}
      failFirst={state === "error"}
      coveragePreview={state === "coverage"}
    />
  );
}
function AttributesPreviewContent({
  failFirst,
  coveragePreview
}: {
  failFirst: boolean;
  coveragePreview: boolean;
}) {
  const router = useRouter();
  const failed = useRef(false);
  const [saved, setSaved] = useState<SessionFormValues | null>(null);
  const [view, setView] = useState<"form" | "saved" | "public">("form");
  const [values, setValues] = useState<SessionFormValues>({
    ...initialSessionForm(),
    title: "Friday Social Padel",
    venueId: coveragePreview ? "" : venue.id,
    venueCourtCoverage: coveragePreview ? ["covered", "uncovered"] : [],
    venueCourtCoverageBaseline: [],
    venueCourtCoverageEdited: coveragePreview,
    courtCoverage: coveragePreview ? "covered" : null,
    venueName: venue.name!,
    venueAddress: venue.address!,
    description:
      "Friendly social padel. Bring your racket and arrive ten minutes early.",
    sessionAttributes: [],
    venueAttributes: venue.attributes,
    venueAttributesBaseline: venue.attributes,
    settings: { ...defaultSessionSettings(), visibility: "public" }
  });
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/sessions-preview");
  if (view === "public" && saved)
    return (
      <PublicSessionView
        preview
        previewCoverUri={saved.coverLocalUri}
        session={{
          ...publicSessionPreview,
          court_coverage:
            saved.courtCoverage ??
            (saved.venueCourtCoverage?.length === 1
              ? saved.venueCourtCoverage[0]
              : null),
          attributes: saved.sessionAttributes ?? [],
          venue: {
            ...publicSessionPreview.venue,
            court_coverage: saved.venueCourtCoverage ?? [],
            attributes: saved.venueAttributes ?? []
          }
        }}
        onBack={() => setView("saved")}
        onShare={() => {}}
        reviews={{
          data: emptyPublicReviews,
          loading: false,
          error: false,
          onRetry: () => {},
          onAll: () => {}
        }}
      />
    );
  if (view === "saved" && saved)
    return (
      <Screen>
        <View style={{ gap: 20 }}>
          <AppHeading variant="section">
            Draft saved · Design preview
          </AppHeading>
          <AppText variant="bodySm" tone="muted">
            No account changes. These selections are held only in this preview.
          </AppText>
          <AppHeading variant="card">What’s included</AppHeading>
          <AttributeChips codes={saved.sessionAttributes ?? []} />
          <AppHeading variant="card">At the venue</AppHeading>
          <AttributeChips codes={saved.venueAttributes ?? []} />
          <AppButton
            onPress={() => {
              setValues(saved);
              setView("form");
            }}
          >
            Resume draft
          </AppButton>
          <AppButton
            variant="ghost"
            color="essential"
            onPress={() => setView("public")}
          >
            Preview public detail
          </AppButton>
          <AppButton variant="ghost" onPress={back}>
            Back
          </AppButton>
        </View>
      </Screen>
    );
  return (
    <Screen
      keyboardSafe
      scrollable={false}
      contentStyle={{ flex: 1, paddingHorizontal: 0 }}
      contentContainerStyle={{ flex: 1, paddingTop: 0, paddingBottom: 0 }}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="caption" tone="subtle">
          Design preview · No account changes
        </AppText>
        <SessionForm
          initialValues={values}
          venues={[venue]}
          onExit={back}
          onSave={async (input) => {
            if (failFirst && !failed.current) {
              failed.current = true;
              throw new Error("Preview connection error");
            }
            setSaved(input);
            setView("saved");
          }}
        />
      </View>
    </Screen>
  );
}
